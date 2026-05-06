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
`);

// Seed default admin if not exists
const adminCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
if (adminCount.count === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run('admin@mokad.org', hash, 'מנהל מערכת', 'admin');
  console.log('Default admin created: admin@mokad.org / admin123');
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

  // Admin User Management
  app.get('/api/admin/users', isAdmin, (req, res) => {
    const users = db.prepare('SELECT email, name, role FROM users').all();
    res.json(users);
  });

  app.post('/api/admin/users', isAdmin, (req, res) => {
    const { email, password, name, role } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'Missing fields' });

    // Check if updating or creating
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get() as any;
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
