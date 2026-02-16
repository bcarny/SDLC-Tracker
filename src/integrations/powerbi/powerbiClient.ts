import { env } from '../../config/env.js';

export interface PowerBIConfig {
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  workspaceId?: string;
}

interface PowerBITokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PowerBIDataset {
  id: string;
  name: string;
  tables: PowerBITable[];
}

interface PowerBITable {
  name: string;
  columns: PowerBIColumn[];
}

interface PowerBIColumn {
  name: string;
  dataType: string;
}

export class PowerBIClient {
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;
  private workspaceId: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config?: PowerBIConfig) {
    this.clientId = config?.clientId || env.POWERBI_CLIENT_ID || '';
    this.clientSecret = config?.clientSecret || env.POWERBI_CLIENT_SECRET || '';
    this.tenantId = config?.tenantId || env.POWERBI_TENANT_ID || '';
    this.workspaceId = config?.workspaceId || env.POWERBI_WORKSPACE_ID || '';

    if (!this.clientId || !this.clientSecret || !this.tenantId) {
      throw new Error('PowerBI credentials are required (CLIENT_ID, CLIENT_SECRET, TENANT_ID)');
    }
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PowerBI OAuth authentication failed: ${response.status} ${errorText}`);
    }

    const data: PowerBITokenResponse = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000); // Refresh 5 min before expiry
    return this.accessToken;
  }

  private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    const url = `https://api.powerbi.com/v1.0/myorg${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PowerBI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async getDatasets(): Promise<PowerBIDataset[]> {
    const workspaceEndpoint = this.workspaceId ? `/groups/${this.workspaceId}/datasets` : '/datasets';
    const response = await this.apiRequest<{ value: PowerBIDataset[] }>(workspaceEndpoint);
    return response.value || [];
  }

  async getDataset(datasetId: string): Promise<PowerBIDataset> {
    const workspaceEndpoint = this.workspaceId ? `/groups/${this.workspaceId}/datasets/${datasetId}` : `/datasets/${datasetId}`;
    return this.apiRequest<PowerBIDataset>(workspaceEndpoint);
  }

  async createDataset(name: string, tables: PowerBITable[]): Promise<PowerBIDataset> {
    const workspaceEndpoint = this.workspaceId ? `/groups/${this.workspaceId}/datasets` : '/datasets';
    return this.apiRequest<PowerBIDataset>(workspaceEndpoint, {
      method: 'POST',
      body: JSON.stringify({
        name,
        tables,
        defaultMode: 'Push',
      }),
    });
  }

  async pushRows(datasetId: string, tableName: string, rows: Record<string, unknown>[]): Promise<void> {
    const workspaceEndpoint = this.workspaceId ? `/groups/${this.workspaceId}/datasets/${datasetId}/tables/${tableName}/rows` : `/datasets/${datasetId}/tables/${tableName}/rows`;
    await this.apiRequest(workspaceEndpoint, {
      method: 'POST',
      body: JSON.stringify({ rows }),
    });
  }

  async clearRows(datasetId: string, tableName: string): Promise<void> {
    const workspaceEndpoint = this.workspaceId ? `/groups/${this.workspaceId}/datasets/${datasetId}/tables/${tableName}/rows` : `/datasets/${datasetId}/tables/${tableName}/rows`;
    await this.apiRequest(workspaceEndpoint, {
      method: 'DELETE',
    });
  }

  async deleteDataset(datasetId: string): Promise<void> {
    const workspaceEndpoint = this.workspaceId ? `/groups/${this.workspaceId}/datasets/${datasetId}` : `/datasets/${datasetId}`;
    await this.apiRequest(workspaceEndpoint, {
      method: 'DELETE',
    });
  }
}
