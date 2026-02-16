import { Router } from 'express';
import { z } from 'zod';
import { ServiceNowSyncService } from './servicenowSyncService.js';
import { ServiceNowClient } from './servicenowClient.js';
import { handleServiceError } from '../../utils/routeHelpers.js';

export const servicenowRoutes = Router();

const syncSchema = z.object({
  tableName: z.string().optional(),
  query: z.string().optional(),
  preserveManualEdits: z.boolean().optional().default(true),
});

const syncTeamsSchema = z.object({
  tableName: z.string().optional(),
  query: z.string().optional(),
});

const syncAssessmentSchema = z.object({
  applicationId: z.string().min(1),
  tableName: z.string().optional(),
});

servicenowRoutes.post('/sync', async (req, res) => {
  try {
    const parsed = syncSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.errors });
    }

    const client = new ServiceNowClient();
    const syncService = new ServiceNowSyncService(client);
    const result = await syncService.syncApplicationsFromServiceNow(
      parsed.data.tableName,
      parsed.data.query,
      parsed.data.preserveManualEdits
    );

    res.json({
      success: true,
      result,
    });
  } catch (e) {
    return handleServiceError(e, res);
  }
});

servicenowRoutes.post('/sync/teams', async (req, res) => {
  try {
    const parsed = syncTeamsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.errors });
    }

    const client = new ServiceNowClient();
    const syncService = new ServiceNowSyncService(client);
    const result = await syncService.syncTeamsFromServiceNow(parsed.data.tableName, parsed.data.query);

    res.json({
      success: true,
      result,
    });
  } catch (e) {
    return handleServiceError(e, res);
  }
});

servicenowRoutes.post('/sync/assessment', async (req, res) => {
  try {
    const parsed = syncAssessmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.errors });
    }

    const client = new ServiceNowClient();
    const syncService = new ServiceNowSyncService(client);
    await syncService.syncAssessmentsToServiceNow(parsed.data.applicationId, parsed.data.tableName);

    res.json({
      success: true,
      message: 'Assessment synced to ServiceNow successfully',
    });
  } catch (e) {
    return handleServiceError(e, res);
  }
});

servicenowRoutes.get('/status', async (_req, res) => {
  try {
    const client = new ServiceNowClient();
    // Test connection by making a simple API call
    await client.get('sys_user', undefined, 1);

    res.json({
      status: 'connected',
      message: 'ServiceNow connection successful',
    });
  } catch (e) {
    return res.status(503).json({
      status: 'disconnected',
      error: e instanceof Error ? e.message : 'Unknown error',
    });
  }
});
