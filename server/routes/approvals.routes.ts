import { Router } from 'express';
import db from '../db.js';
import { validateBody } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/auth.js';
import {
  ApprovalAddSchema, ApprovalAddBody,
  ApprovalApproveSchema, ApprovalApproveBody,
  DBApproval,
} from '../types.js';
import { emit } from '../socket.js';

const router = Router();

// GET /api/approvals — pending list (managers only)
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(
    `SELECT * FROM approvals WHERE status = 'pending' ORDER BY id DESC`
  ).all() as DBApproval[];
  res.json(rows.map(r => ({ ...r, id: String(r.id), urgent: Boolean(r.urgent) })));
});

// POST /api/approvals — field reporter submits for approval (no auth required)
router.post('/', validateBody(ApprovalAddSchema), (req, res) => {
  const { author, text, scene, urgent = false } = req.body as ApprovalAddBody;
  const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const result = db.prepare(
    'INSERT INTO approvals (time, author, text, scene, urgent) VALUES (?, ?, ?, ?, ?)'
  ).run(time, author, text, scene ?? null, urgent ? 1 : 0);
  emit('approvals:changed');
  res.json({ success: true, id: result.lastInsertRowid });
});

// POST /api/approvals/:id/approve — publish to feed with optional text edit
router.post('/:id/approve', requireAuth, validateBody(ApprovalApproveSchema), (req, res) => {
  const { id } = req.params;
  const approval = db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as DBApproval | undefined;
  if (!approval) return res.status(404).json({ error: 'לא נמצא' });

  const text = (req.body as ApprovalApproveBody).text ?? approval.text;
  const feedTime = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  db.prepare('INSERT INTO feed (time, src, text, urgent) VALUES (?, ?, ?, ?)').run(feedTime, approval.author, text, approval.urgent);
  db.prepare('UPDATE approvals SET status = ? WHERE id = ?').run('approved', id);
  emit('approvals:changed');
  emit('feed:changed');
  res.json({ success: true });
});

// POST /api/approvals/:id/reject
router.post('/:id/reject', requireAuth, (req, res) => {
  const { id } = req.params;
  const result = db.prepare('UPDATE approvals SET status = ? WHERE id = ?').run('rejected', id);
  if (result.changes === 0) return res.status(404).json({ error: 'לא נמצא' });
  emit('approvals:changed');
  res.json({ success: true });
});

export default router;
