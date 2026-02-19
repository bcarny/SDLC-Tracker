import type { CreateTeamInput, UpdateTeamInput } from '../repositories/teamRepository.js';
import { teamRepository } from '../repositories/teamRepository.js';

export const teamService = {
  async list(organizationId?: string | null) {
    return teamRepository.list(organizationId);
  },

  async create(data: CreateTeamInput) {
    return teamRepository.create(data);
  },

  async getById(id: string) {
    const team = await teamRepository.findById(id);
    if (!team) throw new Error('Team not found');
    return team;
  },

  async update(id: string, data: UpdateTeamInput) {
    await this.getById(id);
    return teamRepository.update(id, data);
  },

  async delete(id: string) {
    await this.getById(id);
    return teamRepository.delete(id);
  },
};
