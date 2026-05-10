import { Router } from 'express';
import db from '../db.js';
import { validateBody } from '../middlewares/validate.js';
import { IncidentAddSchema, IncidentAddBody, IncidentUpdateSchema, IncidentUpdateBody } from '../types.js';

const router = Router();

router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM incidents ORDER BY id DESC').all();
  res.json(items);
});

router.post('/', validateBody(IncidentAddSchema), (req, res) => {
  const { type, location, severity } = req.body as IncidentAddBody;
  const result = db.prepare('INSERT INTO incidents (type, location, status, severity) VALUES (?, ?, ?, ?)').run(
    type, location, 'בטיפול', severity || 'amber'
  );
  const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  db.prepare('INSERT INTO feed (time, src, text, urgent, system) VALUES (?, ?, ?, ?, 1)').run(
    time, 'מערכת', `אירוע שגרה נפתח: ${type} ב${location}`, severity === 'red' ? 1 : 0
  );
  res.json({ success: true, id: result.lastInsertRowid });
});

router.post('/:id/close', (req, res) => {
  db.prepare('UPDATE incidents SET status = ? WHERE id = ?').run('הסתיים', req.params.id);
  res.json({ success: true });
});

router.post('/:id/update', validateBody(IncidentUpdateSchema), (req, res) => {
  const { type, location, status, severity } = req.body as IncidentUpdateBody;
  db.prepare('UPDATE incidents SET type = ?, location = ?, status = ?, severity = ? WHERE id = ?')
    .run(type, location, status, severity, req.params.id);
  res.json({ success: true });
});

export default router;
