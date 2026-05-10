import { Router } from 'express';
import db from '../db.js';
import { validateBody } from '../middlewares/validate.js';
import { EvacSchema, EvacBody } from '../types.js';
import { emit } from '../socket.js';

const router = Router();

router.post('/', validateBody(EvacSchema), (req, res) => {
  const { event_id, who, by, to, state } = req.body as EvacBody;
  db.prepare('INSERT INTO event_evac (event_id, who, "by", "to", state) VALUES (?, ?, ?, ?, ?)').run(
    event_id, who, by || '', to || '', state || 'בדרך'
  );
  emit('emergency:changed');
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM event_evac WHERE id = ?').run(req.params.id);
  emit('emergency:changed');
  res.json({ success: true });
});

export default router;
