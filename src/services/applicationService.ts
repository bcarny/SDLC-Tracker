import { ApplicationSource, ApplicationType, TeamRole } from '@prisma/client';
import type { CreateApplicationInput, UpdateApplicationInput } from '../repositories/applicationRepository.js';
import { applicationRepository } from '../repositories/applicationRepository.js';
import { organizationRepository } from '../repositories/organizationRepository.js';
import { teamRepository } from '../repositories/teamRepository.js';

export type ApplicationFilters = { type?: ApplicationType; source?: ApplicationSource; organizationId?: string };

export const applicationService = {
  async create(data: CreateApplicationInput) {
    const org = await organizationRepository.findById(data.organizationId);
    if (!org) throw new Error('Organization not found');
    if (data.externalId) {
      const existing = await applicationRepository.findByExternalId(data.externalId);
      if (existing) {
        throw new Error(`Application with external_id ${data.externalId} already exists`);
      }
    }
    return applicationRepository.create(data);
  },

  async getById(id: string) {
    const app = await applicationRepository.findById(id);
    if (!app) throw new Error('Application not found');
    return app;
  },

  async list(filters?: ApplicationFilters) {
    return applicationRepository.list(filters);
  },

  async update(id: string, data: UpdateApplicationInput) {
    await this.getById(id);
    if (data.externalId != null) {
      const existing = await applicationRepository.findByExternalId(data.externalId);
      if (existing && existing.id !== id) {
        throw new Error(`Application with external_id ${data.externalId} already exists`);
      }
    }
    return applicationRepository.update(id, data);
  },

  async delete(id: string) {
    await this.getById(id);
    return applicationRepository.delete(id);
  },

  async addTeamToApplication(applicationId: string, teamId: string, role?: TeamRole) {
    const app = await this.getById(applicationId);
    const team = await teamRepository.findById(teamId);
    if (!team) throw new Error('Team not found');
    const alreadyLinked = app.teams?.some((at) => at.teamId === teamId);
    if (alreadyLinked) throw new Error('Team is already linked to this application');
    return applicationRepository.addTeam(applicationId, teamId, role ?? 'supporting');
  },

  async removeTeamFromApplication(applicationId: string, teamId: string) {
    await this.getById(applicationId);
    return applicationRepository.removeTeam(applicationId, teamId);
  },
};
