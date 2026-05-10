import { Router } from 'express';
import db from '../db.js';
import { validateBody } from '../middlewares/validate.js';
import { 
  EmergencyStartSchema, EmergencyStartBody, 
  EmergencyUpdateSchema, EmergencyUpdateBody, 
  EmergencyCloseSchema, EmergencyCloseBody,
  DBActiveEvent 
} from '../types.js';

const router = Router();

router.get('/active', (req, res) => {
  const event = db.prepare('SELECT * FROM active_event WHERE is_active = 1').get() as DBActiveEvent | undefined;
  if (!event) return res.json(null);

  const forces = db.prepare('SELECT * FROM event_forces WHERE event_id = ?').all(event.id);
  const evac = db.prepare('SELECT * FROM event_evac WHERE event_id = ?').all(event.id);
  const media = db.prepare('SELECT * FROM media WHERE event_id = ?').all(event.id);

  res.json({ ...event, forces, evac, media });
});

router.post('/start', validateBody(EmergencyStartSchema), (req, res) => {
  const { type, location, grid, scene_name, description } = req.body as EmergencyStartBody;
  const id = `EV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const started_at = Date.now();
  const snapshot_at = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  // Close any previous events
  db.prepare('UPDATE active_event SET is_active = 0').run();

  db.prepare(`
    INSERT INTO active_event (id, type, location, grid, scene_name, started_at, snapshot_at, description, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(id, type, location, grid || '', scene_name || '', started_at, snapshot_at, description || '');

  // Initial system log
  db.prepare('INSERT INTO feed (time, src, text, urgent, system, event_id) VALUES (?, ?, ?, 1, 1, ?)').run(
    snapshot_at, 'מערכת', `נפתח אירוע חירום חדש: ${type} ב${location}`, id
  );

  res.json({ success: true, id });
});

router.post('/update', validateBody(EmergencyUpdateSchema), (req, res) => {
  const { id, dead, critical, serious, light, untreated, missing, trapped, description, map_coords } = req.body as EmergencyUpdateBody;
  const snapshot_at = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  db.prepare(`
    UPDATE active_event
    SET dead = ?, critical = ?, serious = ?, light = ?, untreated = ?, missing = ?, trapped = ?,
        description = ?, snapshot_at = ?, map_coords = ?
    WHERE id = ?
  `).run(
    dead || 0, critical || 0, serious || 0, light || 0, untreated || 0, 
    missing || 0, trapped || 0, 
    description || '', snapshot_at, map_coords || '', id
  );

  res.json({ success: true });
});

router.post('/close', validateBody(EmergencyCloseSchema), (req, res) => {
  const { id } = req.body as EmergencyCloseBody;
  db.prepare('UPDATE active_event SET is_active = 0 WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;
