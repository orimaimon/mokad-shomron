import { Router } from 'express';
import db from '../db.js';
import { validateBody } from '../middlewares/validate.js';
import { RosterAddSchema, RosterAddBody, RosterEditSchema, RosterEditBody, RosterUpdateSchema, RosterUpdateBody, DBRoster } from '../types.js';
import { emit } from '../socket.js';
import { logAction, auditUser } from '../audit.js';

const router = Router();

router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM roster WHERE is_deleted = 0').all();
  res.json(items);
});

router.post('/update', validateBody(RosterUpdateSchema), (req, res) => {
  const { id, is_out_of_sector, replacement, replacement_phone, state, return_time, phone, operational_phone, map_coords, version } = req.body as RosterUpdateBody;

  const existing = db.prepare('SELECT * FROM roster WHERE id = ? AND is_deleted = 0').get(id) as DBRoster | undefined;
  if (!existing) return res.status(404).json({ error: 'בעל תפקיד לא נמצא' });

  const whereVersion = version !== undefined ? ' AND version = ?' : '';
  const runParams = [
    is_out_of_sector ? 1 : 0,
    replacement || '',
    replacement_phone || '',
    state || (is_out_of_sector ? 'out' : 'field'),
    return_time || '',
    phone || '',
    operational_phone || '',
    map_coords || '',
    id,
    ...(version !== undefined ? [version] : []),
  ];
  const result = db.prepare(`
    UPDATE roster SET
      is_out_of_sector = ?, replacement = ?, replacement_phone = ?,
      state = ?, return_time = ?, phone = ?, operational_phone = ?, map_coords = ?,
      version = version + 1
    WHERE id = ? AND is_deleted = 0${whereVersion}
  `).run(...runParams);

  if (result.changes === 0) {
    return res.status(409).json({
      error: 'הרשומה עודכנה על ידי משתמש אחר. אנא רענן ונסה שוב.',
      currentVersion: (db.prepare('SELECT version FROM roster WHERE id = ?').get(id) as DBRoster)?.version,
    });
  }

  if (replacement) {
    db.prepare('INSERT OR IGNORE INTO replacements (name) VALUES (?)').run(replacement);
  }

  logAction({
    ...auditUser(req),
    actionType: 'update',
    entityType: 'roster',
    entityId: String(id),
    previousState: existing,
    newState: { is_out_of_sector, replacement, state, phone, operational_phone, map_coords },
  });

  emit('roster:changed');
  res.json({ success: true });
});

router.post('/add', validateBody(RosterAddSchema), (req, res) => {
  const { name, role, task, phone, operational_phone, state, map_coords } = req.body as RosterAddBody;
  const result = db.prepare(`
    INSERT INTO roster (name, role, task, out_time, state, is_out_of_sector, replacement, phone, operational_phone, map_coords)
    VALUES (?, ?, ?, ?, ?, 0, '', ?, ?, ?)
  `).run(name, role || '', task || '', new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }), state || 'field', phone || '', operational_phone || '', map_coords || '');

  logAction({
    ...auditUser(req),
    actionType: 'create',
    entityType: 'roster',
    entityId: String(result.lastInsertRowid),
    newState: { name, role, task, state: state || 'field', map_coords },
  });

  emit('roster:changed');
  res.json({ success: true, id: result.lastInsertRowid });
});

router.post('/:id/edit', validateBody(RosterEditSchema), (req, res) => {
  const { name, role, task, phone, operational_phone, state, map_coords } = req.body as RosterEditBody;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM roster WHERE id = ? AND is_deleted = 0').get(id) as DBRoster | undefined;
  if (!existing) return res.status(404).json({ error: 'בעל תפקיד לא נמצא' });

  db.prepare('UPDATE roster SET name = ?, role = ?, task = ?, phone = ?, operational_phone = ?, state = ?, map_coords = ?, version = version + 1 WHERE id = ?')
    .run(name, role || '', task || '', phone || '', operational_phone || '', state || 'field', map_coords || '', id);

  logAction({
    ...auditUser(req),
    actionType: 'update',
    entityType: 'roster',
    entityId: String(id),
    previousState: existing,
    newState: { name, role, task, phone, operational_phone, state, map_coords },
  });

  emit('roster:changed');
  res.json({ success: true });
});

// Soft delete — marks as deleted but keeps the record for audit
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM roster WHERE id = ? AND is_deleted = 0').get(id) as DBRoster | undefined;
  if (!existing) return res.status(404).json({ error: 'בעל תפקיד לא נמצא' });

  const now = new Date().toISOString();
  db.prepare('UPDATE roster SET is_deleted = 1, deleted_at = ? WHERE id = ?').run(now, id);

  logAction({
    ...auditUser(req),
    actionType: 'delete',
    entityType: 'roster',
    entityId: String(id),
    previousState: existing,
  });

  emit('roster:changed');
  res.json({ success: true });
});

router.get('/replacements', (req, res) => {
  const items = db.prepare('SELECT name FROM replacements ORDER BY name ASC').all() as { name: string }[];
  res.json(items.map(i => i.name));
});

export default router;
