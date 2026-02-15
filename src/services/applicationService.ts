import { ApplicationSource, ApplicationType } from '@prisma/client';
import type { CreateApplicationInput, UpdateApplicationInput } from '../repositories/applicationRepository.js';
import { applicationRepository } from '../repositories/applicationRepository.js';

export type ApplicationFilters = { type?: ApplicationType; source?: ApplicationSource };

export const applicationService = {
  async create(data: CreateApplicationInput) {
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
};
