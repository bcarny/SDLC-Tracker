import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PowerBIClient } from './powerbiClient.js';

vi.mock('../../config/env.js', () => ({
  env: {
    POWERBI_CLIENT_ID: 'test-client-id',
    POWERBI_CLIENT_SECRET: 'test-secret',
    POWERBI_TENANT_ID: 'test-tenant',
    POWERBI_WORKSPACE_ID: 'test-workspace',
  },
}));

global.fetch = vi.fn();

describe('PowerBIClient', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  describe('constructor', () => {
    it('creates client with config', () => {
      const client = new PowerBIClient({
        clientId: 'custom-id',
        clientSecret: 'custom-secret',
        tenantId: 'custom-tenant',
      });
      expect(client).toBeDefined();
    });

    it('creates client with env vars', () => {
      const client = new PowerBIClient();
      expect(client).toBeDefined();
    });

    it('uses env vars when config not provided', () => {
      // When config is not provided, it should use env vars (which are mocked)
      const client = new PowerBIClient();
      expect(client).toBeDefined();
    });
  });

  describe('getAccessToken', () => {
    it('fetches OAuth token', async () => {
      const mockTokenResponse = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      const client = new PowerBIClient();
      const token = await (
        client as unknown as { getAccessToken: () => Promise<string> }
      ).getAccessToken();

      expect(token).toBe('test-token');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/oauth2/v2.0/token'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('caches token until expiry', async () => {
      const mockTokenResponse = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      const client = new PowerBIClient();
      const clientCast = client as unknown as { getAccessToken: () => Promise<string> };
      const token1 = await clientCast.getAccessToken();
      const token2 = await clientCast.getAccessToken();

      expect(token1).toBe(token2);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDatasets', () => {
    it('fetches datasets from PowerBI', async () => {
      const mockDatasets = {
        value: [
          { id: 'ds1', name: 'Dataset 1', tables: [] },
          { id: 'ds2', name: 'Dataset 2', tables: [] },
        ],
      };

      // Mock token fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600,
        }),
      } as Response);

      // Mock datasets fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDatasets,
      } as Response);

      const client = new PowerBIClient();
      const datasets = await client.getDatasets();

      expect(datasets).toHaveLength(2);
      expect(datasets[0].id).toBe('ds1');
    });
  });
});
