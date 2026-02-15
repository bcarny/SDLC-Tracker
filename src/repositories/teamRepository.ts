import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';

export type CreateTeamInput = {
  name: string;
  externalId?: string | null;
};

export type UpdateTeamInput = Partial<CreateTeamInput>;

export const teamRepository = {
  async create(data: CreateTeamInput) {
    return prisma.team.create({ data });
  },

  async findById(id: string) {
    return prisma.team.findUnique({
      where: { id },
      include: { applications: { include: { application: true } }, assessments: true },
    });
  },

  async findByExternalId(externalId: string) {
    return prisma.team.findUnique({
      where: { externalId },
      include: { applications: { include: { application: true } } },
    });
  },

  async list() {
    return prisma.team.findMany({
      include: { applications: { include: { application: true } } },
      orderBy: { name: 'asc' },
    });
  },

  async update(id: string, data: UpdateTeamInput) {
    return prisma.team.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.team.delete({ where: { id } });
  },
};
