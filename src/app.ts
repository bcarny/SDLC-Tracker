import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { healthRoutes } from './routes/healthRoutes.js';
import { applicationRoutes } from './routes/applicationRoutes.js';
import { teamRoutes } from './routes/teamRoutes.js';
import { assessmentRoutes } from './routes/assessmentRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(express.json());

  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));
  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use(healthRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/assessments', assessmentRoutes);

  app.get('/api', (_req, res) => {
    res.json({
      name: 'SDLC Maturity Tracker',
      version: '0.1.0',
      docs: '/api/applications',
    });
  });

  // Catch-all: if no route matched, we still respond with JSON (proves this server was hit)
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found', path: _req.path, message: 'No route matched. Use the URL from the terminal (e.g. http://localhost:3000).' });
  });

  return app;
}
