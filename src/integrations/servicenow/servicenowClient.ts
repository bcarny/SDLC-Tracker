import { env } from '../../config/env.js';

export interface ServiceNowConfig {
  baseUrl: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface ServiceNowResponse<T> {
  result: T[];
}

export class ServiceNowClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(config?: ServiceNowConfig) {
    const baseUrl = config?.baseUrl || env.SERVICENOW_BASE_URL;
    if (!baseUrl) {
      throw new Error('ServiceNow base URL is required');
    }
    this.baseUrl = baseUrl.replace(/\/$/, '');

    // Use Basic Auth if username/password provided, otherwise OAuth
    if (config?.username && config?.password) {
      const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      this.authHeader = `Basic ${credentials}`;
    } else if (config?.clientId && config?.clientSecret) {
      // OAuth will be handled separately
      this.authHeader = '';
    } else if (env.SERVICENOW_USER && env.SERVICENOW_PASSWORD) {
      const credentials = Buffer.from(`${env.SERVICENOW_USER}:${env.SERVICENOW_PASSWORD}`).toString('base64');
      this.authHeader = `Basic ${credentials}`;
    } else {
      throw new Error('ServiceNow authentication credentials are required');
    }
  }

  private async getOAuthToken(): Promise<string> {
    if (!env.SERVICENOW_CLIENT_ID || !env.SERVICENOW_CLIENT_SECRET) {
      throw new Error('ServiceNow OAuth credentials are required');
    }

    const response = await fetch(`${this.baseUrl}/oauth_token.do`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env.SERVICENOW_CLIENT_ID,
        client_secret: env.SERVICENOW_CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      throw new Error(`ServiceNow OAuth authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  private async getAuthHeader(): Promise<string> {
    if (this.authHeader) {
      return this.authHeader;
    }
    const token = await this.getOAuthToken();
    return `Bearer ${token}`;
  }

  async get<T>(table: string, query?: string, limit = 10000): Promise<T[]> {
    const url = new URL(`${this.baseUrl}/api/now/table/${table}`);
    if (query) {
      url.searchParams.set('sysparm_query', query);
    }
    url.searchParams.set('sysparm_limit', limit.toString());
    url.searchParams.set('sysparm_display_value', 'false');

    const authHeader = await this.getAuthHeader();
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}`);
    }

    const data: ServiceNowResponse<T> = await response.json();
    return data.result;
  }

  async getPaginated<T>(
    table: string,
    query?: string,
    pageSize = 1000,
    onPage?: (items: T[]) => Promise<void>
  ): Promise<T[]> {
    const allItems: T[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const url = new URL(`${this.baseUrl}/api/now/table/${table}`);
      if (query) {
        url.searchParams.set('sysparm_query', query);
      }
      url.searchParams.set('sysparm_limit', pageSize.toString());
      url.searchParams.set('sysparm_offset', offset.toString());
      url.searchParams.set('sysparm_display_value', 'false');

      const authHeader = await this.getAuthHeader();
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}`);
      }

      const data: ServiceNowResponse<T> = await response.json();
      const items = data.result;

      if (items.length === 0) {
        hasMore = false;
      } else {
        allItems.push(...items);
        if (onPage) {
          await onPage(items);
        }
        offset += pageSize;
        hasMore = items.length === pageSize;
      }
    }

    return allItems;
  }

  async post<T>(table: string, data: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}/api/now/table/${table}`;
    const authHeader = await this.getAuthHeader();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result: ServiceNowResponse<T> = await response.json();
    return result.result[0];
  }

  async put<T>(table: string, sysId: string, data: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}/api/now/table/${table}/${sysId}`;
    const authHeader = await this.getAuthHeader();

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result: ServiceNowResponse<T> = await response.json();
    return result.result[0];
  }
}
