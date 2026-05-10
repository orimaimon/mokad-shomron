import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

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
    replacement TEXT,
    phone TEXT DEFAULT '',
    operational_phone TEXT DEFAULT '',
    replacement_phone TEXT DEFAULT ''
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
    trapped INTEGER DEFAULT 0,
    map_coords TEXT DEFAULT ''
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

  CREATE TABLE IF NOT EXISTS shift_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manager_name TEXT,
    start_time TEXT,
    end_time TEXT,
    status TEXT DEFAULT 'active',
    open_incidents_count INTEGER DEFAULT 0,
    out_of_sector_count INTEGER DEFAULT 0,
    hardware_status TEXT,
    notes TEXT,
    dispatchers TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS shift_operators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TEXT,
    author TEXT,
    text TEXT,
    scene TEXT,
    urgent INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending'
  );
`);

// Migrations are already handled by default values in CREATE TABLE above,
// but adding them here ensures safety for existing databases that don't have these columns yet.
try { db.exec('ALTER TABLE active_event ADD COLUMN map_coords TEXT DEFAULT ""'); } catch {}
try { db.exec('ALTER TABLE roster ADD COLUMN phone TEXT DEFAULT ""'); } catch {}
try { db.exec('ALTER TABLE roster ADD COLUMN operational_phone TEXT DEFAULT ""'); } catch {}
try { db.exec('ALTER TABLE roster ADD COLUMN replacement_phone TEXT DEFAULT ""'); } catch {}
try { db.exec('ALTER TABLE shift_logs ADD COLUMN dispatchers TEXT DEFAULT \'[]\''); } catch {}

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
    { type: 'זיהוי תנועה חריגה', loc: 'גדר מערבית, מקטע 4', status: 'בטיפול', sev: 'amber' },
    { type: 'הפרעת סדר נקודתית', loc: 'צומת הכניסה', status: 'הסתיים', sev: 'green' },
    { type: 'חשד לחדירה (שווא)', loc: 'שער אחורי', status: 'הסתיים', sev: 'red' },
  ];
  const stmt = db.prepare('INSERT INTO incidents (type, location, status, severity) VALUES (?, ?, ?, ?)');
  incs.forEach(i => stmt.run(i.type, i.loc, i.status, i.sev));
}

export default db;
