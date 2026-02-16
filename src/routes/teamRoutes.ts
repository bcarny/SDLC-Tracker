import { Router } from 'express';
import { z } from 'zod';
import { teamService } from '../services/teamService.js';
import { handleServiceError, handleValidationError } from '../utils/routeHelpers.js';

export const teamRoutes = Router();

const createTeamSchema = z.object({
  name: z.string().min(1).max(500),
  externalId: z.string().max(255).optional().nullable(),
});

const updateTeamSchema = createTeamSchema.partial();

teamRoutes.get('/', async (_req, res) => {
  try {
    const teams = await teamService.list();
    res.json(teams);
  } catch (e) {
    return handleServiceError(e, res);
  }
});

teamRoutes.get('/:id', async (req, res) => {
  try {
    const team = await teamService.getById(req.params.id);
    res.json(team);
  } catch (e) {
    return handleServiceError(e, res, ['Team not found']);
  }
});

teamRoutes.post('/', async (req, res) => {
  const parsed = createTeamSchema.safeParse(req.body);
  if (!parsed.success) return handleValidationError(parsed.error, res);
  
  try {
    const team = await teamService.create(parsed.data);
    res.status(201).json(team);
  } catch (e) {
    return handleServiceError(e, res);
  }
});

teamRoutes.patch('/:id', async (req, res) => {
  const parsed = updateTeamSchema.safeParse(req.body);
  if (!parsed.success) return handleValidationError(parsed.error, res);
  
  try {
    const team = await teamService.update(req.params.id, parsed.data);
    res.json(team);
  } catch (e) {
    return handleServiceError(e, res, ['Team not found']);
  }
});

teamRoutes.delete('/:id', async (req, res) => {
  try {
    await teamService.delete(req.params.id);
    res.status(204).send();
  } catch (e) {
    return handleServiceError(e, res, ['Team not found']);
  }
});
