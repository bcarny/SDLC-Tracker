import { Router } from 'express';
import { z } from 'zod';
import { applicationService } from '../services/applicationService.js';
import { assessmentService } from '../services/assessmentService.js';
import { ApplicationSource, ApplicationType, TeamRole } from '@prisma/client';

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

const addTeamSchema = z.object({
  teamId: z.string().min(1),
  role: z.nativeEnum(TeamRole).optional(),
});

applicationRoutes.get('/', async (req, res) => {
  const query = listQuerySchema.safeParse(req.query);
  const filters = query.success ? query.data : undefined;
  const apps = await applicationService.list(filters);
  res.json(apps);
});

applicationRoutes.get('/:id/assessments', async (req, res) => {
  try {
    await applicationService.getById(req.params.id);
    const assessments = await assessmentService.getAssessmentsForApplication(req.params.id);
    res.json(assessments);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Not found';
    res.status(404).json({ error: msg });
  }
});

applicationRoutes.post('/:id/teams', async (req, res) => {
  const parsed = addTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.flatten();
    return res.status(400).json({
      error: 'Validation failed',
      details: details.fieldErrors as Record<string, string[]>,
    });
  }
  const applicationId = req.params.id?.trim();
  const teamId = parsed.data.teamId?.trim();
  if (!applicationId || !teamId) {
    return res.status(400).json({ error: 'Application ID and team ID are required' });
  }
  try {
    const link = await applicationService.addTeamToApplication(
      applicationId,
      teamId,
      parsed.data.role
    );
    res.status(201).json(link);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Application not found' || msg === 'Team not found') {
      return res.status(404).json({ error: msg });
    }
    if (msg.includes('expected pattern') || msg.includes('Invalid')) {
      return res.status(400).json({
        error: 'Invalid application or team. Try going back to Applications, opening this app again, then link the team.',
      });
    }
    res.status(400).json({ error: msg });
  }
});

applicationRoutes.delete('/:id/teams/:teamId', async (req, res) => {
  try {
    await applicationService.removeTeamFromApplication(req.params.id, req.params.teamId);
    res.status(204).send();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    res.status(msg === 'Application not found' ? 404 : 400).json({ error: msg });
  }
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
