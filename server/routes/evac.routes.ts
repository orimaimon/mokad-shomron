import { Router } from 'express';
import db from '../db.js';
import { validateBody } from '../middlewares/validate.js';
import { EvacSchema, EvacBody } from '../types.js';
import { emit } from '../socket.js';
import { logAction, auditUser } from '../audit.js';

const router = Router();

router.post('/', validateBody(EvacSchema), (req, res) => {
  const { event_id, who, by, to, state } = req.body as EvacBody;
  const result = db.prepare('INSERT INTO event_evac (event_id, who, "by", "to", state) VALUES (?, ?, ?, ?, ?)').run(
    event_id, who, by || '', to || '', state || 'בדרך'
  );

  logAction({
    ...auditUser(req),
    actionType: 'create',
    entityType: 'evac',
    entityId: String(result.lastInsertRowid),
    newState: { event_id, who, by, to, state },
  });

  emit('emergency:changed');
  res.json({ success: true });
});

// Soft delete — marks as deleted but keeps the record
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM event_evac WHERE id = ? AND is_deleted = 0').get(id);
  if (!existing) return res.status(404).json({ error: 'לא נמצא' });

  db.prepare('UPDATE event_evac SET is_deleted = 1 WHERE id = ?').run(id);

  logAction({
    ...auditUser(req),
    actionType: 'delete',
    entityType: 'evac',
    entityId: id,
    previousState: existing,
  });

  emit('emergency:changed');
  res.json({ success: true });
});

export default router;
