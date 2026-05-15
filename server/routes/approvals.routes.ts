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
import { logAction, auditUser } from '../audit.js';

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
  const body = req.body as ApprovalAddBody & { author: string };
  const { author, text, scene, media, urgent = false, src_type = 'field' } = body;
  const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const result = db.prepare(
    'INSERT INTO approvals (time, author, text, scene, media, urgent, src_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(time, author, text, scene ?? null, media ?? null, urgent ? 1 : 0, src_type);

  logAction({
    ...auditUser(req),
    actionType: 'create',
    entityType: 'approval',
    entityId: String(result.lastInsertRowid),
    newState: { author, text, scene, media, urgent, time },
  });

  emit('approvals:changed');
  res.json({ success: true, id: result.lastInsertRowid });
});

// POST /api/approvals/:id/approve — publish to feed with optional text edit
router.post('/:id/approve', requireAuth, validateBody(ApprovalApproveSchema), (req, res) => {
  const { id } = req.params;
  const approval = db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as DBApproval | undefined;
  if (!approval) return res.status(404).json({ error: 'לא נמצא' });

  const approvalRow = approval as typeof approval & { text: string; author: string; src_type?: string };
  const text = (req.body as ApprovalApproveBody).text ?? approvalRow.text;
  const src_type = approvalRow.src_type ?? 'field';
  const feedTime = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const created_at = new Date().toISOString();
  db.prepare('INSERT INTO feed (time, src, text, urgent, media, src_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(feedTime, approvalRow.author, text, approval.urgent, approval.media, src_type, created_at);
  db.prepare('UPDATE approvals SET status = ? WHERE id = ?').run('approved', id);

  logAction({
    ...auditUser(req),
    actionType: 'approve',
    entityType: 'approval',
    entityId: String(id),
    previousState: approval,
    newState: { ...approval, status: 'approved' },
  });

  emit('approvals:changed');
  emit('feed:changed');
  res.json({ success: true });
});

// POST /api/approvals/:id/reject
router.post('/:id/reject', requireAuth, (req, res) => {
  const { id } = req.params;
  const approval = db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as DBApproval | undefined;
  if (!approval) return res.status(404).json({ error: 'לא נמצא' });

  const result = db.prepare('UPDATE approvals SET status = ? WHERE id = ?').run('rejected', id);
  if (result.changes === 0) return res.status(404).json({ error: 'לא נמצא' });

  logAction({
    ...auditUser(req),
    actionType: 'reject',
    entityType: 'approval',
    entityId: String(id),
    previousState: approval,
    newState: { ...approval, status: 'rejected' },
  });

  emit('approvals:changed');
  res.json({ success: true });
});

export default router;
