import { Router } from 'express';
import { z } from 'zod';
import { assessmentService } from '../services/assessmentService.js';
import { handleServiceError, handleValidationError } from '../utils/routeHelpers.js';

export const assessmentRoutes = Router();

const saveAssessmentSchema = z.object({
  applicationId: z.string().min(1),
  teamId: z.string().min(1).nullable().optional(),
  scores: z.record(z.string(), z.number()),
});

assessmentRoutes.post('/', async (req, res) => {
  const parsed = saveAssessmentSchema.safeParse(req.body);
  if (!parsed.success) return handleValidationError(parsed.error, res);

  try {
    const assessment = await assessmentService.saveAssessment(
      parsed.data.applicationId,
      parsed.data.scores,
      parsed.data.teamId
    );
    res.status(201).json(assessment);
  } catch (e) {
    const message = (e as Error).message;
    if (message === 'Team is not linked to this application') {
      return res.status(400).json({ error: message });
    }
    return handleServiceError(e, res, ['Application not found']);
  }
});
