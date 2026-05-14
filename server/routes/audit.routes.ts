import { Router } from 'express';
import db from '../db.js';
import { requireAdmin } from '../middlewares/auth.js';
import { DBAuditLog } from '../types.js';

const router = Router();

// Secure all endpoints — admin only
router.use(requireAdmin);

// GET /api/audit — paginated audit log
router.get('/', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = (page - 1) * limit;

  const entityType = req.query.entity_type as string | undefined;
  const actionType = req.query.action_type as string | undefined;

  let where = '1=1';
  const params: unknown[] = [];

  if (entityType) {
    where += ' AND entity_type = ?';
    params.push(entityType);
  }
  if (actionType) {
    where += ' AND action_type = ?';
    params.push(actionType);
  }

  const total = (db.prepare(`SELECT count(*) as count FROM action_logs WHERE ${where}`).get(...params) as { count: number }).count;
  const items = db.prepare(`SELECT * FROM action_logs WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as DBAuditLog[];

  res.json({
    items: items.map(row => ({
      ...row,
      previous_state: row.previous_state ? JSON.parse(row.previous_state) : null,
      new_state: row.new_state ? JSON.parse(row.new_state) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    })),
    total,
    page,
    limit,
  });
});

// GET /api/audit/:entityType/:entityId — paginated audit trail for a specific entity
router.get('/:entityType/:entityId', (req, res) => {
  const { entityType, entityId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const offset = (page - 1) * limit;

  const total = (db.prepare(
    'SELECT count(*) as count FROM action_logs WHERE entity_type = ? AND entity_id = ?'
  ).get(entityType, entityId) as { count: number }).count;

  const items = db.prepare(
    'SELECT * FROM action_logs WHERE entity_type = ? AND entity_id = ? ORDER BY id ASC LIMIT ? OFFSET ?'
  ).all(entityType, entityId, limit, offset) as DBAuditLog[];

  res.json({
    items: items.map(row => ({
      ...row,
      previous_state: row.previous_state ? JSON.parse(row.previous_state) : null,
      new_state: row.new_state ? JSON.parse(row.new_state) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    })),
    total,
    page,
    limit,
  });
});

export default router;
