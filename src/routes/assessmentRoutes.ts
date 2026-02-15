import { Router } from 'express';
import { z } from 'zod';
import { assessmentService } from '../services/assessmentService.js';

export const assessmentRoutes = Router();

const saveAssessmentSchema = z.object({
  applicationId: z.string().min(1),
  teamId: z.string().min(1).nullable().optional(),
  scores: z.record(z.string(), z.number()),
});

assessmentRoutes.post('/', async (req, res) => {
  const parsed = saveAssessmentSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.flatten();
    return res.status(400).json({
      error: 'Validation failed',
      details: details.fieldErrors as Record<string, string[]>,
    });
  }
  try {
    const assessment = await assessmentService.saveAssessment(
      parsed.data.applicationId,
      parsed.data.scores,
      parsed.data.teamId
    );
    res.status(201).json(assessment);
  } catch (e) {
    const message = (e as Error).message;
    const status = message === 'Application not found' ? 404 : message === 'Team is not linked to this application' ? 400 : 400;
    res.status(status).json({ error: message });
  }
});
