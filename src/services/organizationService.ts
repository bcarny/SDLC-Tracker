import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '../repositories/organizationRepository.js';
import { organizationRepository } from '../repositories/organizationRepository.js';

export const organizationService = {
  async create(data: CreateOrganizationInput) {
    return organizationRepository.create(data);
  },

  async getById(id: string) {
    const org = await organizationRepository.findById(id);
    if (!org) throw new Error('Organization not found');
    return org;
  },

  async list() {
    return organizationRepository.list();
  },

  async update(id: string, data: UpdateOrganizationInput) {
    await this.getById(id);
    return organizationRepository.update(id, data);
  },

  async delete(id: string) {
    await this.getById(id);
    return organizationRepository.delete(id);
  },
};
