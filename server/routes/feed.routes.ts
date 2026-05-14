import { Router } from 'express';
import db from '../db.js';
import { validateBody } from '../middlewares/validate.js';
import { FeedAddSchema, FeedAddBody } from '../types.js';
import { emit } from '../socket.js';
import { logAction, auditUser } from '../audit.js';

const router = Router();

router.get('/', (req, res) => {
  const srcType = req.query.src_type as string | undefined;
  const VALID_SRC_TYPES = new Set(['internal', 'osint', 'field']);
  if (srcType && !VALID_SRC_TYPES.has(srcType)) {
    return res.status(400).json({ error: 'src_type לא תקין' });
  }
  const items = srcType
    ? db.prepare('SELECT * FROM feed WHERE is_deleted = 0 AND src_type = ? ORDER BY id DESC LIMIT 100').all(srcType)
    : db.prepare('SELECT * FROM feed WHERE is_deleted = 0 ORDER BY id DESC LIMIT 100').all();
  res.json(items);
});

router.post('/', validateBody(FeedAddSchema), (req, res) => {
  const { src, text, urgent, event_id, src_type = 'internal', media } = req.body as FeedAddBody;
  const system = (req.body as FeedAddBody & { system?: boolean }).system;
  const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const created_at = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO feed (time, src, text, urgent, system, event_id, src_type, created_at, media) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(time, src, text, urgent ? 1 : 0, system ? 1 : 0, event_id || null, src_type, created_at, media || null);

  logAction({
    ...auditUser(req),
    actionType: 'create',
    entityType: 'feed',
    entityId: String(result.lastInsertRowid),
    newState: { src, text, urgent, time },
  });

  emit('feed:changed');
  res.json({ success: true });
});

// Soft delete — marks as deleted but keeps the record
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM feed WHERE id = ? AND is_deleted = 0').get(id);
  if (!existing) return res.status(404).json({ error: 'לא נמצא' });

  const now = new Date().toISOString();
  db.prepare('UPDATE feed SET is_deleted = 1, deleted_at = ? WHERE id = ?').run(now, id);

  logAction({
    ...auditUser(req),
    actionType: 'delete',
    entityType: 'feed',
    entityId: id,
    previousState: existing,
  });

  emit('feed:changed');
  res.json({ success: true });
});

export default router;
