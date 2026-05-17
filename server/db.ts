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
    replacement_phone TEXT DEFAULT '',
    map_coords TEXT DEFAULT '',
    version INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT,
    version INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS feed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TEXT,
    src TEXT,
    text TEXT,
    urgent INTEGER DEFAULT 0,
    system INTEGER DEFAULT 0,
    event_id TEXT,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT
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
    map_coords TEXT DEFAULT '',
    version INTEGER DEFAULT 1
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
    state TEXT,
    is_deleted INTEGER DEFAULT 0
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

  -- Audit Trail table
  CREATE TABLE IF NOT EXISTS action_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    previous_state TEXT,
    new_state TEXT,
    metadata TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Performance indexes (on columns that exist in the original schema)
  CREATE INDEX IF NOT EXISTS idx_action_logs_entity ON action_logs(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_action_logs_time ON action_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_action_logs_user ON action_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
  CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at);
`);

// Migrations are already handled by default values in CREATE TABLE above,
// but adding them here ensures safety for existing databases that don't have these columns yet.
try { db.exec('ALTER TABLE active_event ADD COLUMN map_coords TEXT DEFAULT ""'); } catch {}
try { db.exec('ALTER TABLE roster ADD COLUMN phone TEXT DEFAULT ""'); } catch {}
try { db.exec('ALTER TABLE roster ADD COLUMN operational_phone TEXT DEFAULT ""'); } catch {}
try { db.exec('ALTER TABLE roster ADD COLUMN replacement_phone TEXT DEFAULT ""'); } catch {}
try { db.exec('ALTER TABLE roster ADD COLUMN map_coords TEXT DEFAULT ""'); } catch {}
try { db.exec('ALTER TABLE shift_logs ADD COLUMN dispatchers TEXT DEFAULT \'[]\''); } catch {}
// v2 migrations – version, soft-delete, audit
try { db.exec('ALTER TABLE incidents ADD COLUMN version INTEGER DEFAULT 1'); } catch {}
try { db.exec('ALTER TABLE incidents ADD COLUMN is_deleted INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE incidents ADD COLUMN deleted_at TEXT'); } catch {}
try { db.exec('ALTER TABLE incidents ADD COLUMN updated_at TEXT'); } catch {}
try { db.exec('ALTER TABLE active_event ADD COLUMN version INTEGER DEFAULT 1'); } catch {}
try { db.exec('ALTER TABLE roster ADD COLUMN version INTEGER DEFAULT 1'); } catch {}
try { db.exec('ALTER TABLE roster ADD COLUMN is_deleted INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE roster ADD COLUMN deleted_at TEXT'); } catch {}
try { db.exec('ALTER TABLE event_evac ADD COLUMN is_deleted INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE approvals ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch {}
try { db.exec('ALTER TABLE event_forces ADD COLUMN is_deleted INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE approvals ADD COLUMN media TEXT'); } catch {}
{
  const approvalCols = (db.pragma('table_info(approvals)') as { name: string }[]).map(c => c.name);
  if (!approvalCols.includes('src_type')) db.exec("ALTER TABLE approvals ADD COLUMN src_type TEXT DEFAULT 'field'");
}

// Feed column migrations — explicit check so silent catch can't hide missing columns
{
  const feedCols = (db.pragma('table_info(feed)') as { name: string }[]).map(c => c.name);
  if (!feedCols.includes('is_deleted'))  db.exec('ALTER TABLE feed ADD COLUMN is_deleted INTEGER DEFAULT 0');
  if (!feedCols.includes('deleted_at'))  db.exec('ALTER TABLE feed ADD COLUMN deleted_at TEXT');
  if (!feedCols.includes('src_type'))    db.exec("ALTER TABLE feed ADD COLUMN src_type TEXT DEFAULT 'internal'");
  if (!feedCols.includes('created_at'))  db.exec('ALTER TABLE feed ADD COLUMN created_at TEXT');
  if (!feedCols.includes('media'))       db.exec('ALTER TABLE feed ADD COLUMN media TEXT');
}
try { db.exec('ALTER TABLE incidents ADD COLUMN map_coords TEXT DEFAULT ""'); } catch {}
// Indexes on v2 columns — must run after ALTER TABLE migrations above
try { db.exec('CREATE INDEX IF NOT EXISTS idx_incidents_deleted ON incidents(is_deleted)'); } catch {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_feed_deleted ON feed(is_deleted)'); } catch {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_roster_deleted ON roster(is_deleted)'); } catch {}

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
