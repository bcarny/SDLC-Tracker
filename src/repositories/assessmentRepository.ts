import { prisma } from '../config/db.js';

export type ScoresSnapshot = Record<string, number>;

export const assessmentRepository = {
  async create(data: {
    applicationId: string;
    teamId: string | null;
    assessmentDate: Date;
    assessor?: string | null;
    status?: 'draft' | 'completed';
    scoresSnapshot?: ScoresSnapshot | null;
  }) {
    return prisma.assessment.create({
      data: {
        ...data,
        scoresSnapshot: data.scoresSnapshot ?? undefined,
      },
    });
  },

  async findLatestByTeamAndApplication(teamId: string, applicationId: string) {
    return prisma.assessment.findFirst({
      where: { teamId, applicationId },
      orderBy: { assessmentDate: 'desc' },
      include: { maturityScores: true },
    });
  },

  async findById(id: string) {
    return prisma.assessment.findUnique({
      where: { id },
      include: { maturityScores: true, team: true },
    });
  },

  async listByApplication(applicationId: string) {
    return prisma.assessment.findMany({
      where: { applicationId },
      include: { team: true },
      orderBy: { assessmentDate: 'desc' },
    });
  },
};
