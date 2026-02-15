import { Router } from 'express';
import { healthService } from '../services/healthService.js';

export const healthRoutes = Router();

healthRoutes.get('/health', async (_req, res) => {
  const status = await healthService.check();
  const statusCode = status.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(status);
});
