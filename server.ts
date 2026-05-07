import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'mokad-secret-key-2024';

// Initialize Database
const db = new Database('mokad.db');
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT DEFAULT 'dispatcher'
  );

  CREATE TABLE IF NOT EXISTS roster (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    role TEXT,
    task TEXT,
    out_time TEXT,
    return_time TEXT,
    reason TEXT,
    state TEXT,
    is_out_of_sector INTEGER DEFAULT 0,
    replacement TEXT
  );

  CREATE TABLE IF NOT EXISTS replacements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    location TEXT,
    status TEXT,
    severity TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS feed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TEXT,
    src TEXT,
    text TEXT,
    urgent INTEGER DEFAULT 0,
    system INTEGER DEFAULT 0,
    event_id TEXT
  );

  CREATE TABLE IF NOT EXISTS active_event (
    id TEXT PRIMARY KEY,
    type TEXT,
    location TEXT,
    grid TEXT,
    scene_name TEXT,
    started_at INTEGER,
    snapshot_at TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    dead INTEGER DEFAULT 0,
    critical INTEGER DEFAULT 0,
    serious INTEGER DEFAULT 0,
    light INTEGER DEFAULT 0,
    untreated INTEGER DEFAULT 0,
    missing INTEGER DEFAULT 0,
    trapped INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS event_forces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT,
    name TEXT,
    icon TEXT,
    count INTEGER
  );

  CREATE TABLE IF NOT EXISTS event_evac (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT,
    who TEXT,
    "by" TEXT,
    "to" TEXT,
    state TEXT
  );

  CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT,
    kind TEXT,
    cap TEXT,
    time TEXT,
    cls TEXT,
    dur TEXT
  );
`);

// Seed default admin if empty
const adminCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
if (adminCount.count === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run('admin@mokad.org', hash, 'מנהל מערכת', 'admin');
  console.log('Default admin created: admin@mokad.org / admin123');
}

// Seed default roster if empty
const rosterCount = db.prepare('SELECT count(*) as count FROM roster').get() as { count: number };
if (rosterCount.count === 0) {
  const members = [
    { name: 'אביב לוי', role: 'קב"ט מרחבי', task: 'סיור גזרה דרום', out: '07:42', state: 'field' },
    { name: 'נועה כהן', role: 'רב"ש קדומים', task: 'בדיקת גדר היקפית', out: '08:15', state: 'field' },
    { name: 'איתן ברק', role: 'מפקד כיתת כוננות', task: 'תדריך פלוגה', out: '11:00', state: 'brief' },
    { name: 'מאיה אדרי', role: 'קצינת מבצעים', task: 'יציאה מהגזרה - חופשה', out: '12:30', state: 'out', isOutOfSector: 1, replacement: 'אלון שוורץ' },
    { name: 'יואב פרידמן', role: 'סייר רכוב', task: 'איוש מחסום ג\'ית', out: '06:40', state: 'return' },
  ];
  const stmt = db.prepare('INSERT INTO roster (name, role, task, out_time, state, is_out_of_sector, replacement) VALUES (?, ?, ?, ?, ?, ?, ?)');
  members.forEach(m => stmt.run(m.name, m.role, m.task, m.out, m.state, m.isOutOfSector || 0, m.replacement || ''));
}

// Seed default routine incidents if empty
const incCount = db.prepare('SELECT count(*) as count FROM incidents').get() as { count: number };
if (incCount.count === 0) {
  const incs = [
    { type: 'תאונת דרכים', loc: 'ציר 55 ק"מ 12', status: 'בטיפול', sev: 'amber' },
    { type: 'חשד פריצה', loc: 'יישוב טל-מנשה', status: 'הסתיים', sev: 'green' },
    { type: 'אש בשטח פתוח', loc: 'ואדי קנה', status: 'בכוח', sev: 'amber' },
  ];
  const stmt = db.prepare('INSERT INTO incidents (type, location, status, severity) VALUES (?, ?, ?, ?)');
  incs.forEach(i => stmt.run(i.type, i.loc, i.status, i.sev));
}

// Helper to verify admin
const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing token' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cors());

  // --- API ROUTES ---

  // Auth
  app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { name: user.name, role: user.role, email: user.email } });
  });

  // Roster API
  app.get('/api/roster', (req, res) => {
    const items = db.prepare('SELECT * FROM roster').all();
    res.json(items);
  });

  app.post('/api/roster/update', (req, res) => {
    const { id, is_out_of_sector, replacement, state, reason, return_time } = req.body;
    db.prepare('UPDATE roster SET is_out_of_sector = ?, replacement = ?, state = ?, reason = ?, return_time = ? WHERE id = ?').run(
      is_out_of_sector ? 1 : 0,
      replacement || '',
      state || (is_out_of_sector ? 'out' : 'field'),
      reason || '',
      return_time || '',
      id
    );

    // Save replacement name if it's new
    if (replacement) {
      db.prepare('INSERT OR IGNORE INTO replacements (name) VALUES (?)').run(replacement);
    }

    res.json({ success: true });
  });

  app.get('/api/replacements', (req, res) => {
    const items = db.prepare('SELECT name FROM replacements ORDER BY name ASC').all();
    res.json(items.map((i: any) => i.name));
  });

  // Incidents & Feed
  app.get('/api/incidents', (req, res) => {
    const items = db.prepare('SELECT * FROM incidents ORDER BY id DESC').all();
    res.json(items);
  });

  app.post('/api/incidents', (req, res) => {
    const { type, location, severity } = req.body;
    if (!type || !location) return res.status(400).json({ error: 'Missing fields' });
    const result = db.prepare('INSERT INTO incidents (type, location, status, severity) VALUES (?, ?, ?, ?)').run(
      type, location, 'בטיפול', severity || 'amber'
    );
    const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    db.prepare('INSERT INTO feed (time, src, text, urgent, system) VALUES (?, ?, ?, ?, 1)').run(
      time, 'מערכת', `אירוע שגרה נפתח: ${type} ב${location}`, severity === 'red' ? 1 : 0
    );
    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.post('/api/incidents/:id/close', (req, res) => {
    db.prepare('UPDATE incidents SET status = ? WHERE id = ?').run('הסתיים', req.params.id);
    res.json({ success: true });
  });

  app.get('/api/feed', (req, res) => {
    const items = db.prepare('SELECT * FROM feed ORDER BY id DESC LIMIT 100').all();
    res.json(items);
  });

  app.delete('/api/feed/:id', (req, res) => {
    db.prepare('DELETE FROM feed WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/feed', (req, res) => {
    const { src, text, urgent, system, event_id } = req.body;
    const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    db.prepare('INSERT INTO feed (time, src, text, urgent, system, event_id) VALUES (?, ?, ?, ?, ?, ?)').run(
      time, src, text, urgent ? 1 : 0, system ? 1 : 0, event_id || null
    );
    res.json({ success: true });
  });

  // Emergency Management
  app.get('/api/emergency/active', (req, res) => {
    const event = db.prepare('SELECT * FROM active_event WHERE is_active = 1').get() as any;
    if (!event) return res.json(null);

    const forces = db.prepare('SELECT * FROM event_forces WHERE event_id = ?').all(event.id);
    const evac = db.prepare('SELECT * FROM event_evac WHERE event_id = ?').all(event.id);
    const media = db.prepare('SELECT * FROM media WHERE event_id = ?').all(event.id);

    res.json({ ...event, forces, evac, media });
  });

  app.post('/api/emergency/start', (req, res) => {
    const { type, location, grid, scene_name, description } = req.body;
    const id = `EV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const started_at = Date.now();
    const snapshot_at = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    // Close any previous events
    db.prepare('UPDATE active_event SET is_active = 0').run();

    db.prepare(`
      INSERT INTO active_event (id, type, location, grid, scene_name, started_at, snapshot_at, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, type, location, grid, scene_name, started_at, snapshot_at, description);

    // Initial system log
    db.prepare('INSERT INTO feed (time, src, text, urgent, system, event_id) VALUES (?, ?, ?, 1, 1, ?)').run(
      snapshot_at, 'מערכת', `נפתח אירוע חירום חדש: ${type} ב${location}`, id
    );

    res.json({ success: true, id });
  });

  app.post('/api/emergency/update', (req, res) => {
    const { id, dead, critical, serious, light, untreated, missing, trapped, description } = req.body;
    const snapshot_at = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    db.prepare(`
      UPDATE active_event 
      SET dead = ?, critical = ?, serious = ?, light = ?, untreated = ?, missing = ?, trapped = ?, description = ?, snapshot_at = ?
      WHERE id = ?
    `).run(dead, critical, serious, light, untreated, missing, trapped, description, snapshot_at, id);

    res.json({ success: true });
  });

  app.post('/api/emergency/close', (req, res) => {
    const { id } = req.body;
    db.prepare('UPDATE active_event SET is_active = 0 WHERE id = ?').run(id);
    res.json({ success: true });
  });

  app.post('/api/evac', (req, res) => {
    const { event_id, who, by, to, state } = req.body;
    if (!event_id || !who) return res.status(400).json({ error: 'Missing fields' });
    db.prepare('INSERT INTO event_evac (event_id, who, "by", "to", state) VALUES (?, ?, ?, ?, ?)').run(
      event_id, who, by || '', to || '', state || 'בדרך'
    );
    res.json({ success: true });
  });

  app.delete('/api/evac/:id', (req, res) => {
    db.prepare('DELETE FROM event_evac WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Admin User Management
  app.get('/api/admin/users', isAdmin, (req, res) => {
    const users = db.prepare('SELECT email, name, role FROM users').all();
    res.json(users);
  });

  app.post('/api/admin/users', isAdmin, (req, res) => {
    const { email, password, name, role } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'Missing fields' });

    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (existing) {
      if (password) {
        const hash = bcrypt.hashSync(password, 10);
        db.prepare('UPDATE users SET name = ?, role = ?, password = ? WHERE email = ?').run(name, role, hash, email);
      } else {
        db.prepare('UPDATE users SET name = ?, role = ? WHERE email = ?').run(name, role, email);
      }
    } else {
      if (!password) return res.status(400).json({ error: 'Password required for new user' });
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(email, hash, name, role);
    }
    res.json({ success: true });
  });

  app.delete('/api/admin/users/:email', isAdmin, (req, res) => {
    const { email } = req.params;
    if (email === 'admin@mokad.org') return res.status(400).json({ error: 'Cannot delete primary admin' });
    db.prepare('DELETE FROM users WHERE email = ?').run(email);
    res.json({ success: true });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();

