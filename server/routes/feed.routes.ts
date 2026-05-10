import { Router } from 'express';
import db from '../db.js';
import { validateBody } from '../middlewares/validate.js';
import { FeedAddSchema, FeedAddBody } from '../types.js';
import { emit } from '../socket.js';

const router = Router();

router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM feed ORDER BY id DESC LIMIT 100').all();
  res.json(items);
});

router.post('/', validateBody(FeedAddSchema), (req, res) => {
  const { src, text, urgent, system, event_id } = req.body as FeedAddBody;
  const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  db.prepare('INSERT INTO feed (time, src, text, urgent, system, event_id) VALUES (?, ?, ?, ?, ?, ?)').run(
    time, src, text, urgent ? 1 : 0, system ? 1 : 0, event_id || null
  );
  emit('feed:changed');
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM feed WHERE id = ?').run(req.params.id);
  emit('feed:changed');
  res.json({ success: true });
});

export default router;
