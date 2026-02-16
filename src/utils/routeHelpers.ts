import { Response } from 'express';
import { ZodError } from 'zod';

export function handleServiceError(e: unknown, res: Response, notFoundMessages: string[] = []) {
  const msg = e instanceof Error ? e.message : 'An error occurred';
  const status = notFoundMessages.includes(msg) ? 404 : 400;
  return res.status(status).json({ error: msg });
}

export function handleValidationError(error: ZodError, res: Response) {
  const details = error.flatten();
  return res.status(400).json({
    error: 'Validation failed',
    details: details.fieldErrors as Record<string, string[]>,
  });
}
