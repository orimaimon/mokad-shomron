import { Router } from 'express';
import db from '../db.js';
import { validateBody } from '../middlewares/validate.js';
import { RosterAddSchema, RosterAddBody, RosterEditSchema, RosterEditBody, RosterUpdateSchema, RosterUpdateBody } from '../types.js';

const router = Router();

router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM roster').all();
  res.json(items);
});

router.post('/update', validateBody(RosterUpdateSchema), (req, res) => {
  const { id, is_out_of_sector, replacement, replacement_phone, state, return_time, phone, operational_phone } = req.body as RosterUpdateBody;
  db.prepare(`
    UPDATE roster SET
      is_out_of_sector = ?, replacement = ?, replacement_phone = ?,
      state = ?, return_time = ?, phone = ?, operational_phone = ?
    WHERE id = ?
  `).run(
    is_out_of_sector ? 1 : 0,
    replacement || '',
    replacement_phone || '',
    state || (is_out_of_sector ? 'out' : 'field'),
    return_time || '',
    phone || '',
    operational_phone || '',
    id
  );

  if (replacement) {
    db.prepare('INSERT OR IGNORE INTO replacements (name) VALUES (?)').run(replacement);
  }

  res.json({ success: true });
});

router.post('/add', validateBody(RosterAddSchema), (req, res) => {
  const { name, role, task, phone, operational_phone, state } = req.body as RosterAddBody;
  const result = db.prepare(`
    INSERT INTO roster (name, role, task, out_time, state, is_out_of_sector, replacement, phone, operational_phone)
    VALUES (?, ?, ?, ?, ?, 0, '', ?, ?)
  `).run(name, role || '', task || '', new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }), state || 'field', phone || '', operational_phone || '');
  res.json({ success: true, id: result.lastInsertRowid });
});

router.post('/:id/edit', validateBody(RosterEditSchema), (req, res) => {
  const { name, role, task, phone, operational_phone, state } = req.body as RosterEditBody;
  db.prepare('UPDATE roster SET name = ?, role = ?, task = ?, phone = ?, operational_phone = ?, state = ? WHERE id = ?')
    .run(name, role || '', task || '', phone || '', operational_phone || '', state || 'field', req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM roster WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/replacements', (req, res) => {
  const items = db.prepare('SELECT name FROM replacements ORDER BY name ASC').all() as { name: string }[];
  res.json(items.map(i => i.name));
});

export default router;
