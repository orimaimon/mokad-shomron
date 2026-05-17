import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = Router();

router.get('/template/:eventType', requireAuth, (req, res) => {
  const row = db.prepare('SELECT steps FROM sop_templates WHERE event_type = ?').get(req.params.eventType) as { steps: string } | undefined;
  res.json(row ? JSON.parse(row.steps) : []);
});

router.get('/progress/:eventId', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT step_idx, done, done_by, done_at FROM sop_progress WHERE event_id = ?').all(req.params.eventId);
  res.json(rows);
});

router.post('/progress/:eventId', requireAuth, (req, res) => {
  const { step_idx, done, done_by } = req.body as { step_idx: number; done: boolean; done_by?: string };
  const done_at = done ? new Date().toISOString() : '';
  db.prepare('INSERT OR REPLACE INTO sop_progress (event_id, step_idx, done, done_by, done_at) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.eventId, step_idx, done ? 1 : 0, done_by || '', done_at);
  res.json({ ok: true });
});

router.get('/templates', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT event_type, steps FROM sop_templates ORDER BY event_type').all() as { event_type: string; steps: string }[];
  res.json(rows.map(r => ({ event_type: r.event_type, steps: JSON.parse(r.steps) })));
});

router.put('/templates/:eventType', requireAdmin, (req, res) => {
  const { steps } = req.body as { steps: string[] };
  if (!Array.isArray(steps)) return res.status(400).json({ error: 'steps must be an array' });
  db.prepare("INSERT OR REPLACE INTO sop_templates (event_type, steps, updated_at) VALUES (?, ?, datetime('now'))")
    .run(req.params.eventType, JSON.stringify(steps));
  res.json({ ok: true });
});

export default router;
