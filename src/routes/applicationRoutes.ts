import { Router } from 'express';
import { z } from 'zod';
import { applicationService } from '../services/applicationService.js';
import { ApplicationSource, ApplicationType } from '@prisma/client';

export const applicationRoutes = Router();

const createApplicationSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().max(2000).optional().nullable(),
  type: z.nativeEnum(ApplicationType),
  externalId: z.string().max(255).optional().nullable(),
  source: z.nativeEnum(ApplicationSource).optional(),
  dimensions: z.string().optional().nullable(),
});

const updateApplicationSchema = createApplicationSchema.partial();

const listQuerySchema = z.object({
  type: z.nativeEnum(ApplicationType).optional(),
  source: z.nativeEnum(ApplicationSource).optional(),
});

applicationRoutes.get('/', async (req, res) => {
  const query = listQuerySchema.safeParse(req.query);
  const filters = query.success ? query.data : undefined;
  const apps = await applicationService.list(filters);
  res.json(apps);
});

applicationRoutes.get('/:id', async (req, res) => {
  try {
    const app = await applicationService.getById(req.params.id);
    res.json(app);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Not found';
    res.status(404).json({ error: msg });
  }
});

applicationRoutes.post('/', async (req, res) => {
  const parsed = createApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  try {
    const data = { ...parsed.data, source: parsed.data.source ?? 'manual' };
    const app = await applicationService.create(data);
    res.status(201).json(app);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error creating application';
    res.status(400).json({ error: msg });
  }
});

applicationRoutes.patch('/:id', async (req, res) => {
  const parsed = updateApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  try {
    const app = await applicationService.update(req.params.id, parsed.data);
    res.json(app);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error updating application';
    if (msg === 'Application not found') return res.status(404).json({ error: msg });
    res.status(400).json({ error: msg });
  }
});

applicationRoutes.delete('/:id', async (req, res) => {
  try {
    await applicationService.delete(req.params.id);
    res.status(204).send();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error deleting application';
    if (msg === 'Application not found') return res.status(404).json({ error: msg });
    res.status(400).json({ error: msg });
  }
});
