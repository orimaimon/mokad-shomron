import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import morgan from 'morgan';

// Import domain routers
import authRoutes from './server/routes/auth.routes.js';
import rosterRoutes from './server/routes/roster.routes.js';
import incidentsRoutes from './server/routes/incidents.routes.js';
import feedRoutes from './server/routes/feed.routes.js';
import emergencyRoutes from './server/routes/emergency.routes.js';
import evacRoutes from './server/routes/evac.routes.js';
import adminRoutes from './server/routes/admin.routes.js';
import reportsRoutes from './server/routes/reports.routes.js';
import shiftsRoutes from './server/routes/shifts.routes.js';
import approvalsRoutes from './server/routes/approvals.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cors());
  app.use(morgan('dev'));

  // --- API ROUTES ---
  app.use('/api', authRoutes); // mounts /api/login
  app.use('/api/roster', rosterRoutes);
  app.use('/api/incidents', incidentsRoutes);
  app.use('/api/feed', feedRoutes);
  app.use('/api/emergency', emergencyRoutes);
  app.use('/api/evac', evacRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/shifts', shiftsRoutes);
  app.use('/api/approvals', approvalsRoutes);

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  // --- GLOBAL ERROR HANDLER ---
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack ?? err.message);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  });

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
