import { prisma } from '../config/db.js';

export type CreateTeamInput = {
  name: string;
  externalId?: string | null;
  organizationId?: string | null;
};

export type UpdateTeamInput = Partial<CreateTeamInput>;

export const teamRepository = {
  async create(data: CreateTeamInput) {
    const { organizationId, ...rest } = data;
    return prisma.team.create({
      data: { ...rest, organizationId: organizationId || undefined },
    });
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

  async list(organizationId?: string | null) {
    const where = organizationId ? { organizationId } : {};
    return prisma.team.findMany({
      where,
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
