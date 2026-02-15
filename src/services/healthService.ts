import { prisma } from '../config/db.js';

export type HealthStatus = {
  status: 'ok' | 'degraded';
  timestamp: string;
  db: 'connected' | 'disconnected';
};

export const healthService = {
  async check(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    let db: HealthStatus['db'] = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = 'connected';
    } catch {
      // leave db as disconnected
    }
    const status = db === 'connected' ? 'ok' : 'degraded';
    return { status, timestamp, db };
  },
};
