import type { CreateTeamInput } from '../repositories/teamRepository.js';
import { teamRepository } from '../repositories/teamRepository.js';

export const teamService = {
  async list() {
    return teamRepository.list();
  },

  async create(data: CreateTeamInput) {
    return teamRepository.create(data);
  },

  async getById(id: string) {
    const team = await teamRepository.findById(id);
    if (!team) throw new Error('Team not found');
    return team;
  },

  async delete(id: string) {
    await this.getById(id);
    return teamRepository.delete(id);
  },
};
