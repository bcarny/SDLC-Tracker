import { prisma } from '../config/db.js'

export type CreateOrganizationInput = {
  name: string
  description?: string | null
}

export type UpdateOrganizationInput = Partial<CreateOrganizationInput>

export const organizationRepository = {
  async create(data: CreateOrganizationInput) {
    return prisma.organization.create({ data })
  },

  async findById(id: string) {
    return prisma.organization.findUnique({
      where: { id },
      include: {
        applications: { include: { teams: { include: { team: true } } } },
        teams: true,
      },
    })
  },

  async list() {
    return prisma.organization.findMany({
      orderBy: { name: 'asc' },
      include: {
        applications: { include: { teams: { include: { team: true } } } },
        teams: true,
      },
    })
  },

  async update(id: string, data: UpdateOrganizationInput) {
    return prisma.organization.update({
      where: { id },
      data,
    })
  },

  async delete(id: string) {
    return prisma.organization.delete({ where: { id } })
  },

  async findByName(name: string) {
    return prisma.organization.findFirst({
      where: { name },
    })
  },

  async findFirst() {
    return prisma.organization.findFirst({ orderBy: { name: 'asc' } })
  },
}
