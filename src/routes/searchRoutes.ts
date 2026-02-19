import { Router } from 'express';
import { z } from 'zod';
import { ApplicationSource, ApplicationType } from '@prisma/client';
import { searchService } from '../services/searchService.js';
import { handleServiceError } from '../utils/routeHelpers.js';

export const searchRoutes = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  entityType: z
    .union([
      z.enum(['organization', 'application', 'team']),
      z.array(z.enum(['organization', 'application', 'team'])),
    ])
    .optional(),
  appType: z.nativeEnum(ApplicationType).optional(),
  appSource: z.nativeEnum(ApplicationSource).optional(),
  organizationId: z.string().min(1).optional(),
});

searchRoutes.get('/', async (req, res) => {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const result = await searchService.search(parsed.data);
    res.json(result);
  } catch (e) {
    return handleServiceError(e, res);
  }
});
