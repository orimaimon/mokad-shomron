import { Router } from 'express';
import db from '../db.js';

const router = Router();

// KPI Summary
router.get('/kpi', (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString();

  // Total incidents in last 30 days
  const totalIncidentsStmt = db.prepare(`SELECT count(*) as count FROM incidents WHERE is_deleted = 0 AND created_at >= ?`);
  const totalIncidents = (totalIncidentsStmt.get(dateStr) as { count: number }).count;

  // Open incidents right now
  const openIncidentsStmt = db.prepare(`SELECT count(*) as count FROM incidents WHERE is_deleted = 0 AND status != 'הסתיים'`);
  const openIncidents = (openIncidentsStmt.get() as { count: number }).count;

  // Out of sector roster
  const outOfSectorStmt = db.prepare(`SELECT count(*) as count FROM roster WHERE is_deleted = 0 AND is_out_of_sector = 1`);
  const outOfSector = (outOfSectorStmt.get() as { count: number }).count;

  // Emergency events active
  const activeEmergenciesStmt = db.prepare(`SELECT count(*) as count FROM active_event WHERE is_active = 1`);
  const activeEmergencies = (activeEmergenciesStmt.get() as { count: number }).count;

  res.json({ totalIncidents, openIncidents, outOfSector, activeEmergencies });
});

// Trends over 30 days
router.get('/trends', (req, res) => {
  const stmt = db.prepare(`
    SELECT DATE(created_at) as date, count(*) as count
    FROM incidents 
    WHERE is_deleted = 0 AND created_at >= date('now', '-30 days')
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) ASC
  `);
  const rows = stmt.all() as { date: string, count: number }[];
  res.json(rows);
});

// Distribution by Type and Severity
router.get('/distribution', (req, res) => {
  const typesStmt = db.prepare(`
    SELECT type as name, count(*) as value
    FROM incidents 
    WHERE is_deleted = 0 AND created_at >= date('now', '-30 days')
    GROUP BY type
    ORDER BY count(*) DESC
    LIMIT 10
  `);
  const types = typesStmt.all();

  const sevStmt = db.prepare(`
    SELECT severity as name, count(*) as value
    FROM incidents 
    WHERE is_deleted = 0 AND created_at >= date('now', '-30 days')
    GROUP BY severity
  `);
  const severity = sevStmt.all();

  res.json({ types, severity });
});

export default router;
