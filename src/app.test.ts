import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Express, Request, Response } from 'express';
import { createApp } from './app.js';

// Mock DB so we don't need a real DB for this test
vi.mock('./config/db.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

// Mock healthService to avoid DB calls
vi.mock('./services/healthService.js', () => ({
  healthService: {
    check: vi.fn(),
  },
}));

// Mock organizationService so GET /api/organizations and GET /api/organizations/:id work without DB
vi.mock('./services/organizationService.js', () => ({
  organizationService: {
    list: vi.fn(),
    getById: vi.fn(),
  },
}));

// Helper function to simulate HTTP requests without supertest
function makeRequest(
  app: Express,
  method: string,
  path: string
): Promise<{ status: number; body: unknown; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {};
    let body: unknown = null;
    let statusCode = 200;

    const req = {
      method,
      url: path,
      path,
      headers: {},
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      protocol: 'http',
      get(name: string) {
        return this.headers[name as keyof typeof this.headers];
      },
    } as unknown as Request;

    const res = {
      statusCode,
      headers,
      body: null as unknown,
      status(code: number) {
        statusCode = code;
        return this;
      },
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
        return this;
      },
      getHeader(name: string) {
        return headers[name.toLowerCase()];
      },
      removeHeader(name: string) {
        delete headers[name.toLowerCase()];
      },
      json(data: unknown) {
        body = data;
        headers['content-type'] = 'application/json';
        resolve({
          status: statusCode,
          body,
          headers,
        });
      },
      send(data: unknown) {
        body = data;
        resolve({
          status: statusCode,
          body,
          headers,
        });
      },
      end() {
        resolve({
          status: statusCode,
          body,
          headers,
        });
      },
    } as unknown as Response;

    app(req, res, (err?: unknown) => {
      if (err) {
        reject(err);
      }
    });
  });
}

describe('app', () => {
  let app: Express;

  beforeEach(async () => {
    const { healthService } = await import('./services/healthService.js');
    vi.mocked(healthService.check).mockReset();
    app = createApp();
  });

  it('GET /health returns 200 and status when DB is connected', async () => {
    const { healthService } = await import('./services/healthService.js');
    vi.mocked(healthService.check).mockResolvedValue({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    });

    const res = await makeRequest(app, 'GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'connected' });
    expect((res.body as { timestamp?: string }).timestamp).toBeDefined();
  });

  it('GET /health returns 503 when DB is disconnected', async () => {
    const { healthService } = await import('./services/healthService.js');
    vi.mocked(healthService.check).mockResolvedValue({
      status: 'degraded',
      db: 'disconnected',
      timestamp: new Date().toISOString(),
    });

    const res = await makeRequest(app, 'GET', '/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', db: 'disconnected' });
  });

  it('GET /api returns app info', async () => {
    const res = await makeRequest(app, 'GET', '/api');
    expect(res.status).toBe(200);
    expect((res.body as { name?: string }).name).toBe('SDLC Maturity Tracker');
  });

  it('GET /api/organizations returns 200 and array', async () => {
    const { organizationService } = await import('./services/organizationService.js');
    vi.mocked(organizationService.list).mockResolvedValue([
      { id: 'org-1', name: 'Test Org', description: null, createdAt: new Date(), updatedAt: new Date() },
    ] as never);

    const res = await makeRequest(app, 'GET', '/api/organizations');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect((res.body as { id: string; name: string }[]).length).toBe(1);
    expect((res.body as { id: string; name: string }[])[0].name).toBe('Test Org');
  });

  it('GET /api/organizations/:id returns 200 when found', async () => {
    const { organizationService } = await import('./services/organizationService.js');
    const org = {
      id: 'org-1',
      name: 'Test Org',
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      applications: [],
      teams: [],
    };
    vi.mocked(organizationService.getById).mockResolvedValue(org as never);

    const res = await makeRequest(app, 'GET', '/api/organizations/org-1');
    expect(res.status).toBe(200);
    expect((res.body as { id: string; name: string }).id).toBe('org-1');
    expect((res.body as { id: string; name: string }).name).toBe('Test Org');
  });

  it('GET /api/organizations/:id returns 404 when not found', async () => {
    const { organizationService } = await import('./services/organizationService.js');
    vi.mocked(organizationService.getById).mockRejectedValue(new Error('Organization not found'));

    const res = await makeRequest(app, 'GET', '/api/organizations/missing');
    expect(res.status).toBe(404);
    expect((res.body as { error?: string }).error).toBe('Organization not found');
  });
});
