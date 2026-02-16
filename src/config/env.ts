import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // ServiceNow integration (optional)
  SERVICENOW_BASE_URL: z.string().url().optional(),
  SERVICENOW_USER: z.string().optional(),
  SERVICENOW_PASSWORD: z.string().optional(),
  SERVICENOW_CLIENT_ID: z.string().optional(),
  SERVICENOW_CLIENT_SECRET: z.string().optional(),
  // PowerBI integration (optional)
  POWERBI_CLIENT_ID: z.string().optional(),
  POWERBI_CLIENT_SECRET: z.string().optional(),
  POWERBI_TENANT_ID: z.string().optional(),
  POWERBI_WORKSPACE_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(msg)}`);
  }
  return parsed.data;
}

export const env = loadEnv();
