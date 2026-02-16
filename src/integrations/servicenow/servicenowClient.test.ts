import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceNowClient } from './servicenowClient.js';

vi.mock('../../config/env.js', () => ({
  env: {
    SERVICENOW_BASE_URL: 'https://test.service-now.com',
    SERVICENOW_USER: 'testuser',
    SERVICENOW_PASSWORD: 'testpass',
  },
}));

global.fetch = vi.fn();

describe('ServiceNowClient', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  describe('constructor', () => {
    it('creates client with config', () => {
      const client = new ServiceNowClient({
        baseUrl: 'https://custom.service-now.com',
        username: 'user',
        password: 'pass',
      });
      expect(client).toBeDefined();
    });

    it('creates client with env vars', () => {
      const client = new ServiceNowClient();
      expect(client).toBeDefined();
    });

    it('uses env vars when config not provided', () => {
      // When config is not provided, it should use env vars (which are mocked)
      const client = new ServiceNowClient();
      expect(client).toBeDefined();
    });
  });

  describe('get', () => {
    it('fetches data from ServiceNow API', async () => {
      const mockResponse = {
        result: [{ sys_id: '123', name: 'Test CI' }],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const client = new ServiceNowClient();
      const result = await client.get('cmdb_ci_appl');

      expect(result).toEqual(mockResponse.result);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/now/table/cmdb_ci_appl'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
          }),
        })
      );
    });

    it('handles API errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      const client = new ServiceNowClient();
      await expect(client.get('cmdb_ci_appl')).rejects.toThrow('ServiceNow API error');
    });
  });

  describe('post', () => {
    it('posts data to ServiceNow API', async () => {
      const mockResponse = {
        result: [{ sys_id: '123', name: 'Created CI' }],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const client = new ServiceNowClient();
      const result = await client.post('cmdb_ci_appl', { name: 'New CI' });

      expect(result).toEqual(mockResponse.result[0]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/now/table/cmdb_ci_appl'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New CI' }),
        })
      );
    });
  });
});
