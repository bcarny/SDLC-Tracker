import { Router } from 'express';
import { z } from 'zod';
import { PowerBIExportService } from './powerbiExportService.js';
import { PowerBIClient } from './powerbiClient.js';
import { handleServiceError } from '../../utils/routeHelpers.js';

export const powerbiRoutes = Router();

const exportSchema = z.object({
  clearExisting: z.boolean().optional().default(false),
  datasetName: z.string().optional(),
});

powerbiRoutes.post('/export', async (req, res) => {
  try {
    const parsed = exportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.errors });
    }

    const exportService = new PowerBIExportService(undefined, parsed.data.datasetName);
    const result = await exportService.exportToPowerBI(parsed.data.clearExisting);

    res.json({
      success: true,
      result,
    });
  } catch (e) {
    return handleServiceError(e, res);
  }
});

powerbiRoutes.get('/status', async (_req, res) => {
  try {
    const client = new PowerBIClient();
    // Test connection by getting datasets
    await client.getDatasets();

    res.json({
      status: 'connected',
      message: 'PowerBI connection successful',
    });
  } catch (e) {
    return res.status(503).json({
      status: 'disconnected',
      error: e instanceof Error ? e.message : 'Unknown error',
    });
  }
});

powerbiRoutes.get('/datasets', async (_req, res) => {
  try {
    const client = new PowerBIClient();
    const datasets = await client.getDatasets();

    res.json({
      success: true,
      datasets: datasets.map((d) => ({
        id: d.id,
        name: d.name,
        tableCount: d.tables?.length || 0,
      })),
    });
  } catch (e) {
    return handleServiceError(e, res);
  }
});
