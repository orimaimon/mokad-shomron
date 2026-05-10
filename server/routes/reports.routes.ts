import { Router } from 'express';
import db from '../db.js';
import { DBActiveEvent } from '../types.js';

const router = Router();

router.get('/daily', (req, res) => {
  const roster = db.prepare('SELECT * FROM roster ORDER BY name').all();
  const incidents = db.prepare('SELECT * FROM incidents ORDER BY created_at DESC').all();
  const feed = db.prepare(`SELECT * FROM feed WHERE system = 0 AND (event_id IS NULL OR event_id = '') ORDER BY id DESC LIMIT 50`).all();
  const now = new Date();
  res.json({
    generated_at: now.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    date: now.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    roster, incidents, feed,
  });
});

router.get('/events', (req, res) => {
  const events = db.prepare('SELECT * FROM active_event ORDER BY started_at DESC').all();
  res.json(events);
});

router.get('/event/:id', (req, res) => {
  const event = db.prepare('SELECT * FROM active_event WHERE id = ?').get(req.params.id) as DBActiveEvent | undefined;
  if (!event) return res.status(404).json({ error: 'Not found' });
  const forces = db.prepare('SELECT * FROM event_forces WHERE event_id = ?').all(event.id);
  const evac = db.prepare('SELECT * FROM event_evac WHERE event_id = ?').all(event.id);
  const feed = db.prepare('SELECT * FROM feed WHERE event_id = ? ORDER BY id ASC').all(event.id);
  res.json({ ...event, forces, evac, feed });
});

export default router;
