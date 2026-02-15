import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { healthRoutes } from './routes/healthRoutes.js';
import { applicationRoutes } from './routes/applicationRoutes.js';

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

  app.get('/api', (_req, res) => {
    res.json({
      name: 'SDLC Maturity Tracker',
      version: '0.1.0',
      docs: '/api/applications',
    });
  });

  return app;
}
