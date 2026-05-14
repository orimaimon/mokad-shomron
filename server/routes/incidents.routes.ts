import { Router } from 'express';
import db from '../db.js';
import { validateBody } from '../middlewares/validate.js';
import { IncidentAddSchema, IncidentAddBody, IncidentUpdateSchema, IncidentUpdateBody, DBIncident } from '../types.js';
import { emit } from '../socket.js';
import { logAction, auditUser } from '../audit.js';

const router = Router();

// GET / — list incidents with optional filtering & pagination
router.get('/', (req, res) => {
  const status = req.query.status as string | undefined;   // 'open' | 'closed' | 'all'
  const since = req.query.since as string | undefined;     // '24h' | '7d' | '30d' | 'all'
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const offset = (page - 1) * limit;

  let where = 'is_deleted = 0';
  const params: unknown[] = [];

  if (status === 'open') {
    where += " AND status != 'הסתיים'";
  } else if (status === 'closed') {
    where += " AND status = 'הסתיים'";
  }

  if (since && since !== 'all') {
    const hours: Record<string, number> = { '24h': 24, '7d': 168, '30d': 720 };
    const h = hours[since];
    if (h) {
      where += ` AND created_at >= datetime('now', '-${h} hours')`;
    }
  }

  const total = (db.prepare(`SELECT count(*) as count FROM incidents WHERE ${where}`).get(...params) as { count: number }).count;
  const items = db.prepare(`SELECT * FROM incidents WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

  res.json({ items, total, page, limit });
});

// POST / — create a new incident
router.post('/', validateBody(IncidentAddSchema), (req, res) => {
  const { type, location, severity } = req.body as IncidentAddBody;
  const now = new Date().toISOString();
  const result = db.prepare('INSERT INTO incidents (type, location, status, severity, updated_at) VALUES (?, ?, ?, ?, ?)').run(
    type, location, 'בטיפול', severity || 'amber', now
  );
  const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  db.prepare('INSERT INTO feed (time, src, text, urgent, system) VALUES (?, ?, ?, ?, 1)').run(
    time, 'מערכת', `אירוע שגרה נפתח: ${type} ב${location}`, severity === 'red' ? 1 : 0
  );

  logAction({
    ...auditUser(req),
    actionType: 'create',
    entityType: 'incident',
    entityId: String(result.lastInsertRowid),
    newState: { type, location, severity: severity || 'amber', status: 'בטיפול' },
  });

  emit('incidents:changed');
  emit('feed:changed');
  res.json({ success: true, id: result.lastInsertRowid });
});

// POST /:id/close — close an incident (with version check)
router.post('/:id/close', (req, res) => {
  const { id } = req.params;
  const version = req.body?.version as number | undefined;

  const existing = db.prepare('SELECT * FROM incidents WHERE id = ? AND is_deleted = 0').get(id) as DBIncident | undefined;
  if (!existing) return res.status(404).json({ error: 'אירוע לא נמצא' });

  const now = new Date().toISOString();
  const whereVersion = version !== undefined ? ' AND version = ?' : '';
  const params = version !== undefined ? ['הסתיים', now, id, version] : ['הסתיים', now, id];
  const result = db.prepare(`UPDATE incidents SET status = ?, version = version + 1, updated_at = ? WHERE id = ? AND is_deleted = 0${whereVersion}`)
    .run(...params);

  if (result.changes === 0) {
    return res.status(409).json({
      error: 'האירוע עודכן על ידי משתמש אחר. אנא רענן ונסה שוב.',
      currentVersion: (db.prepare('SELECT version FROM incidents WHERE id = ?').get(id) as DBIncident)?.version,
    });
  }

  logAction({
    ...auditUser(req),
    actionType: 'close',
    entityType: 'incident',
    entityId: String(id),
    previousState: existing,
    newState: { ...existing, status: 'הסתיים', version: existing.version + 1 },
  });

  emit('incidents:changed');
  res.json({ success: true });
});

// POST /:id/update — update an incident (with optimistic concurrency)
router.post('/:id/update', validateBody(IncidentUpdateSchema), (req, res) => {
  const { type, location, status, severity, version } = req.body as IncidentUpdateBody;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM incidents WHERE id = ? AND is_deleted = 0').get(id) as DBIncident | undefined;
  if (!existing) return res.status(404).json({ error: 'אירוע לא נמצא' });

  const now = new Date().toISOString();
  const whereVersion = version !== undefined ? ' AND version = ?' : '';
  const params = version !== undefined
    ? [type, location, status, severity, now, id, version]
    : [type, location, status, severity, now, id];
  const result = db.prepare(`UPDATE incidents SET type = ?, location = ?, status = ?, severity = ?, version = version + 1, updated_at = ? WHERE id = ? AND is_deleted = 0${whereVersion}`)
    .run(...params);

  if (result.changes === 0) {
    return res.status(409).json({
      error: 'האירוע עודכן על ידי משתמש אחר. אנא רענן ונסה שוב.',
      currentVersion: (db.prepare('SELECT version FROM incidents WHERE id = ?').get(id) as DBIncident)?.version,
    });
  }

  logAction({
    ...auditUser(req),
    actionType: 'update',
    entityType: 'incident',
    entityId: String(id),
    previousState: existing,
    newState: { type, location, status, severity, version: existing.version + 1 },
  });

  emit('incidents:changed');
  res.json({ success: true });
});

// GET /check-duplicate — check for duplicate incidents at same location
router.get('/check-duplicate', (req, res) => {
  const location = req.query.location as string;
  if (!location) return res.json({ duplicate: false });

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const match = db.prepare(
    `SELECT id, type, location, created_at FROM incidents
     WHERE is_deleted = 0 AND status != 'הסתיים'
     AND location = ? AND created_at >= ?
     ORDER BY id DESC LIMIT 1`
  ).get(location, fiveMinAgo) as DBIncident | undefined;

  if (match) {
    res.json({ duplicate: true, existing: match });
  } else {
    res.json({ duplicate: false });
  }
});

export default router;
