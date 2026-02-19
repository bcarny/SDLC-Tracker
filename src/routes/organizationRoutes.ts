import { Router } from 'express';
import { z } from 'zod';
import { organizationService } from '../services/organizationService.js';
import { handleServiceError, handleValidationError } from '../utils/routeHelpers.js';

export const organizationRoutes = Router();

const createOrganizationSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().max(2000).optional().nullable(),
});

const updateOrganizationSchema = createOrganizationSchema.partial();

organizationRoutes.get('/', async (_req, res) => {
  try {
    const orgs = await organizationService.list();
    res.json(orgs);
  } catch (e) {
    return handleServiceError(e, res);
  }
});

organizationRoutes.get('/:id', async (req, res) => {
  try {
    const org = await organizationService.getById(req.params.id);
    res.json(org);
  } catch (e) {
    return handleServiceError(e, res, ['Organization not found']);
  }
});

organizationRoutes.post('/', async (req, res) => {
  const parsed = createOrganizationSchema.safeParse(req.body);
  if (!parsed.success) return handleValidationError(parsed.error, res);

  try {
    const org = await organizationService.create(parsed.data);
    res.status(201).json(org);
  } catch (e) {
    return handleServiceError(e, res);
  }
});

organizationRoutes.patch('/:id', async (req, res) => {
  const parsed = updateOrganizationSchema.safeParse(req.body);
  if (!parsed.success) return handleValidationError(parsed.error, res);

  try {
    const org = await organizationService.update(req.params.id, parsed.data);
    res.json(org);
  } catch (e) {
    return handleServiceError(e, res, ['Organization not found']);
  }
});

organizationRoutes.delete('/:id', async (req, res) => {
  try {
    await organizationService.delete(req.params.id);
    res.status(204).send();
  } catch (e) {
    return handleServiceError(e, res, ['Organization not found']);
  }
});
