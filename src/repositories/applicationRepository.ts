import { ApplicationSource, ApplicationType, Prisma, TeamRole } from '@prisma/client';
import { prisma } from '../config/db.js';

export type CreateApplicationInput = {
  name: string;
  description?: string | null;
  type: ApplicationType;
  externalId?: string | null;
  source?: ApplicationSource;
  dimensions?: string | null;
};

export type UpdateApplicationInput = Partial<CreateApplicationInput>;

export const applicationRepository = {
  async create(data: CreateApplicationInput) {
    return prisma.application.create({ data });
  },

  async findById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      include: {
        teams: { include: { team: true } },
        assessments: { include: { team: true }, orderBy: { assessmentDate: 'desc' } },
      },
    });
  },

  async findByExternalId(externalId: string) {
    return prisma.application.findUnique({
      where: { externalId },
      include: { teams: { include: { team: true } } },
    });
  },

  async list(filters?: { type?: ApplicationType; source?: ApplicationSource }) {
    const where: Prisma.ApplicationWhereInput = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.source) where.source = filters.source;
    return prisma.application.findMany({
      where,
      include: {
        teams: { include: { team: true } },
        assessments: { include: { team: true }, orderBy: { assessmentDate: 'desc' } },
      },
      orderBy: { name: 'asc' },
    });
  },

  async update(id: string, data: UpdateApplicationInput) {
    return prisma.application.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.application.delete({ where: { id } });
  },

  async findByName(name: string) {
    return prisma.application.findFirst({
      where: { name },
    });
  },

  async addTeam(applicationId: string, teamId: string, role: TeamRole = 'supporting') {
    return prisma.applicationTeam.create({
      data: { applicationId, teamId, role },
      include: { team: true },
    });
  },

  async removeTeam(applicationId: string, teamId: string) {
    return prisma.applicationTeam.delete({
      where: { applicationId_teamId: { applicationId, teamId } },
    });
  },
};
