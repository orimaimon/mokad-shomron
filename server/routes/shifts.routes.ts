import { Router } from 'express';
import db from '../db.js';
import { validateBody } from '../middlewares/validate.js';
import { ShiftStartSchema, ShiftStartBody, ShiftEndSchema, ShiftEndBody, DBShiftLog } from '../types.js';
import { emit } from '../socket.js';
import { logAction, auditUser } from '../audit.js';

const router = Router();

function parseShift(s: DBShiftLog) {
  return {
    ...s,
    dispatchers: JSON.parse(s.dispatchers || '[]') as string[],
  };
}

// Saved operator names for autocomplete
router.get('/operators', (req, res) => {
  const rows = db.prepare('SELECT name FROM shift_operators ORDER BY name ASC').all() as { name: string }[];
  res.json(rows.map(r => r.name));
});

// Active shift
router.get('/active', (req, res) => {
  const shift = db.prepare('SELECT * FROM shift_logs WHERE status = ?').get('active') as DBShiftLog | undefined;
  res.json(shift ? parseShift(shift) : null);
});

// History (closed shifts)
router.get('/', (req, res) => {
  const shifts = db.prepare('SELECT * FROM shift_logs ORDER BY id DESC LIMIT 50').all() as DBShiftLog[];
  res.json(shifts.map(parseShift));
});

// Start a new shift
router.post('/start', validateBody(ShiftStartSchema), (req, res) => {
  const { manager_name, dispatchers = [] } = req.body as ShiftStartBody;

  // Close any existing active shift
  db.prepare('UPDATE shift_logs SET status = ? WHERE status = ?').run('closed', 'active');

  const start_time = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO shift_logs (manager_name, start_time, status, dispatchers) VALUES (?, ?, ?, ?)'
  ).run(manager_name, start_time, 'active', JSON.stringify(dispatchers));

  // Persist operator names for future autocomplete
  const insertOp = db.prepare('INSERT OR IGNORE INTO shift_operators (name) VALUES (?)');
  dispatchers.forEach(name => insertOp.run(name));

  logAction({
    ...auditUser(req),
    actionType: 'start',
    entityType: 'shift',
    entityId: String(result.lastInsertRowid),
    newState: { manager_name, dispatchers, start_time },
  });

  emit('shifts:changed');
  res.json({ success: true, id: result.lastInsertRowid });
});

// End the active shift (handover)
router.post('/end', validateBody(ShiftEndSchema), (req, res) => {
  const { open_incidents_count, out_of_sector_count, hardware_status, notes, dispatchers } = req.body as ShiftEndBody;
  const end_time = new Date().toISOString();

  const activeShift = db.prepare('SELECT * FROM shift_logs WHERE status = ?').get('active') as DBShiftLog | undefined;

  let result;
  if (dispatchers !== undefined) {
    result = db.prepare(`
      UPDATE shift_logs
      SET status = ?, end_time = ?, open_incidents_count = ?, out_of_sector_count = ?,
          hardware_status = ?, notes = ?, dispatchers = ?
      WHERE status = ?
    `).run('closed', end_time, open_incidents_count, out_of_sector_count, hardware_status, notes, JSON.stringify(dispatchers), 'active');

    const insertOp = db.prepare('INSERT OR IGNORE INTO shift_operators (name) VALUES (?)');
    dispatchers.forEach(name => insertOp.run(name));
  } else {
    result = db.prepare(`
      UPDATE shift_logs
      SET status = ?, end_time = ?, open_incidents_count = ?, out_of_sector_count = ?,
          hardware_status = ?, notes = ?
      WHERE status = ?
    `).run('closed', end_time, open_incidents_count, out_of_sector_count, hardware_status, notes, 'active');
  }

  if (result.changes === 0) return res.status(400).json({ error: 'אין משמרת פעילה לסגירה' });

  logAction({
    ...auditUser(req),
    actionType: 'end',
    entityType: 'shift',
    entityId: activeShift ? String(activeShift.id) : 'unknown',
    previousState: activeShift,
    newState: { open_incidents_count, out_of_sector_count, hardware_status, notes, end_time },
  });

  emit('shifts:changed');
  res.json({ success: true });
});

export default router;
