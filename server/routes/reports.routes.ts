import { Router } from 'express';
import db from '../db.js';
import { DBActiveEvent, DBShiftLog } from '../types.js';

const router = Router();

router.get('/daily', (req, res) => {
  const dateParam = req.query.date as string | undefined; // YYYY-MM-DD

  const roster = db.prepare('SELECT * FROM roster WHERE is_deleted = 0 ORDER BY name').all();

  const incidents = dateParam
    ? db.prepare(`SELECT * FROM incidents WHERE is_deleted = 0 AND DATE(created_at) = ? ORDER BY created_at DESC`).all(dateParam)
    : db.prepare(`SELECT * FROM incidents WHERE is_deleted = 0 ORDER BY created_at DESC`).all();

  const feed = db.prepare(`SELECT * FROM feed WHERE is_deleted = 0 AND system = 0 AND (event_id IS NULL OR event_id = '') ORDER BY id DESC LIMIT 50`).all();

  const ref = dateParam ? new Date(dateParam + 'T12:00:00') : new Date();
  res.json({
    generated_at: new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    date: ref.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    roster, incidents, feed,
    filtered_date: dateParam ?? null,
  });
});

router.get('/events', (req, res) => {
  const events = db.prepare('SELECT * FROM active_event ORDER BY started_at DESC').all();
  res.json(events);
});

router.get('/osint', (req, res) => {
  const dateParam = req.query.date as string | undefined; // YYYY-MM-DD
  const items = dateParam
    ? db.prepare(`SELECT * FROM feed WHERE is_deleted = 0 AND src_type = 'osint' AND DATE(created_at) = ? ORDER BY created_at ASC`).all(dateParam)
    : db.prepare(`SELECT * FROM feed WHERE is_deleted = 0 AND src_type = 'osint' ORDER BY created_at DESC LIMIT 200`).all();
  const ref = dateParam ? new Date(dateParam + 'T12:00:00') : new Date();
  res.json({
    generated_at: new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    date: ref.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    items,
    filtered_date: dateParam ?? null,
  });
});

router.get('/shifts', (req, res) => {
  const shifts = db.prepare('SELECT * FROM shift_logs ORDER BY id DESC LIMIT 100').all() as DBShiftLog[];
  res.json(shifts.map(s => ({ ...s, dispatchers: JSON.parse(s.dispatchers || '[]') })));
});

router.get('/shift/:id', (req, res) => {
  const shift = db.prepare('SELECT * FROM shift_logs WHERE id = ?').get(req.params.id) as DBShiftLog | undefined;
  if (!shift) return res.status(404).json({ error: 'Not found' });

  const s = { ...shift, dispatchers: JSON.parse(shift.dispatchers || '[]') as string[] };
  const endIso = s.end_time || new Date().toISOString();
  const incidents = db.prepare(
    `SELECT * FROM incidents WHERE is_deleted = 0 AND created_at >= ? AND created_at <= ? ORDER BY created_at ASC`
  ).all(s.start_time, endIso);

  res.json({ ...s, incidents });
});

router.get('/event/:id', (req, res) => {
  const event = db.prepare('SELECT * FROM active_event WHERE id = ?').get(req.params.id) as DBActiveEvent | undefined;
  if (!event) return res.status(404).json({ error: 'Not found' });
  const forces = db.prepare('SELECT * FROM event_forces WHERE event_id = ?').all(event.id);
  const evac = db.prepare('SELECT * FROM event_evac WHERE event_id = ? AND is_deleted = 0').all(event.id);
  const feed = db.prepare('SELECT * FROM feed WHERE event_id = ? AND is_deleted = 0 ORDER BY id ASC').all(event.id);
  const media = db.prepare('SELECT * FROM media WHERE event_id = ? ORDER BY id ASC').all(event.id);
  res.json({ ...event, forces, evac, feed, media });
});

export default router;
