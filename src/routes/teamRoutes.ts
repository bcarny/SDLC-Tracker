import { Router } from 'express';
import { z } from 'zod';
import { teamService } from '../services/teamService.js';

export const teamRoutes = Router();

const createTeamSchema = z.object({
  name: z.string().min(1).max(500),
  externalId: z.string().max(255).optional().nullable(),
});

teamRoutes.get('/', async (_req, res) => {
  try {
    const teams = await teamService.list();
    res.json(teams);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

teamRoutes.get('/:id', async (req, res) => {
  try {
    const team = await teamService.getById(req.params.id);
    res.json(team);
  } catch (e) {
    const msg = (e as Error).message;
    res.status(msg === 'Team not found' ? 404 : 500).json({ error: msg });
  }
});

teamRoutes.post('/', async (req, res) => {
  const parsed = createTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  try {
    const team = await teamService.create(parsed.data);
    res.status(201).json(team);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

teamRoutes.delete('/:id', async (req, res) => {
  try {
    await teamService.delete(req.params.id);
    res.status(204).send();
  } catch (e) {
    const msg = (e as Error).message;
    res.status(msg === 'Team not found' ? 404 : 500).json({ error: msg });
  }
});
