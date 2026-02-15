import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

// Mock DB so we don't need a real DB for this test
vi.mock('./config/db.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

describe('app', () => {
  beforeEach(async () => {
    const { prisma } = await import('./config/db.js');
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ 1: 1 }]);
  });

  it('GET /health returns 200 and status when DB is connected', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'connected' });
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /health returns 503 when DB is disconnected', async () => {
    const { prisma } = await import('./config/db.js');
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Connection refused'));
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', db: 'disconnected' });
  });

  it('GET /api returns app info', async () => {
    const app = createApp();
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('SDLC Maturity Tracker');
  });
});
