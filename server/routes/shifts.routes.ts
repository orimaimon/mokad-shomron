import { Router } from 'express';
import db from '../db.js';
import { validateBody } from '../middlewares/validate.js';
import { ShiftStartSchema, ShiftStartBody, ShiftEndSchema, ShiftEndBody, DBShiftLog } from '../types.js';

const router = Router();

// Get the currently active shift
router.get('/active', (req, res) => {
  const shift = db.prepare('SELECT * FROM shift_logs WHERE status = ?').get('active') as DBShiftLog | undefined;
  res.json(shift || null);
});

// Get history of all shifts
router.get('/', (req, res) => {
  const shifts = db.prepare('SELECT * FROM shift_logs ORDER BY id DESC LIMIT 50').all();
  res.json(shifts);
});

// Start a new shift
router.post('/start', validateBody(ShiftStartSchema), (req, res) => {
  const { manager_name } = req.body as ShiftStartBody;
  
  // Close any existing active shift just in case
  db.prepare('UPDATE shift_logs SET status = ? WHERE status = ?').run('closed', 'active');
  
  const start_time = new Date().toISOString();
  
  const result = db.prepare(`
    INSERT INTO shift_logs (manager_name, start_time, status)
    VALUES (?, ?, ?)
  `).run(manager_name, start_time, 'active');
  
  res.json({ success: true, id: result.lastInsertRowid });
});

// End the active shift (Handover)
router.post('/end', validateBody(ShiftEndSchema), (req, res) => {
  const { open_incidents_count, out_of_sector_count, hardware_status, notes } = req.body as ShiftEndBody;
  const end_time = new Date().toISOString();

  const result = db.prepare(`
    UPDATE shift_logs
    SET status = ?, end_time = ?, open_incidents_count = ?, out_of_sector_count = ?, hardware_status = ?, notes = ?
    WHERE status = ?
  `).run('closed', end_time, open_incidents_count, out_of_sector_count, hardware_status, notes, 'active');

  if (result.changes === 0) return res.status(400).json({ error: 'אין משמרת פעילה לסגירה' });
  res.json({ success: true });
});

export default router;
