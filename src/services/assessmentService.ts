import { applicationRepository } from '../repositories/applicationRepository.js';
import { assessmentRepository } from '../repositories/assessmentRepository.js';

export type ScoresSnapshot = Record<string, number>;

export const assessmentService = {
  async getAssessmentsForApplication(applicationId: string) {
    return assessmentRepository.listByApplication(applicationId);
  },

  async saveAssessment(applicationId: string, scores: ScoresSnapshot, teamId?: string | null) {
    const app = await applicationRepository.findById(applicationId);
    if (!app) throw new Error('Application not found');
    if (teamId != null) {
      const linked = app.teams?.some((at) => at.teamId === teamId);
      if (!linked) throw new Error('Team is not linked to this application');
    }
    return assessmentRepository.create({
      applicationId,
      teamId: teamId ?? null,
      assessmentDate: new Date(),
      status: 'completed',
      scoresSnapshot: scores,
    });
  },
};
