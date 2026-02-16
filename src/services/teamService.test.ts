import { describe, it, expect, vi, beforeEach } from 'vitest';
import { teamService } from './teamService.js';

vi.mock('../repositories/teamRepository.js', () => ({
  teamRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  },
}));

import * as teamRepository from '../repositories/teamRepository.js';

const repo = teamRepository.teamRepository;

describe('teamService', () => {
  beforeEach(() => {
    vi.mocked(repo.findById).mockReset();
    vi.mocked(repo.create).mockReset();
    vi.mocked(repo.update).mockReset();
    vi.mocked(repo.delete).mockReset();
    vi.mocked(repo.list).mockReset();
  });

  describe('create', () => {
    it('creates team successfully', async () => {
      vi.mocked(repo.create).mockResolvedValue({
        id: 'team-1',
        name: 'Platform Team',
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await teamService.create({
        name: 'Platform Team',
      });

      expect(result.name).toBe('Platform Team');
      expect(repo.create).toHaveBeenCalledWith({
        name: 'Platform Team',
      });
    });
  });

  describe('getById', () => {
    it('returns team when found', async () => {
      const team = {
        id: 'team-1',
        name: 'Platform Team',
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(repo.findById).mockResolvedValue(team as never);

      const result = await teamService.getById('team-1');
      expect(result.name).toBe('Platform Team');
    });

    it('throws when not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(teamService.getById('missing')).rejects.toThrow('Team not found');
    });
  });

  describe('update', () => {
    it('updates team name successfully', async () => {
      vi.mocked(repo.findById).mockResolvedValue({
        id: 'team-1',
        name: 'Old Name',
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      vi.mocked(repo.update).mockResolvedValue({
        id: 'team-1',
        name: 'New Name',
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await teamService.update('team-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(repo.findById).toHaveBeenCalledWith('team-1');
      expect(repo.update).toHaveBeenCalledWith('team-1', { name: 'New Name' });
    });

    it('throws when team not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(teamService.update('missing', { name: 'New Name' })).rejects.toThrow(
        'Team not found'
      );
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes team successfully', async () => {
      vi.mocked(repo.findById).mockResolvedValue({
        id: 'team-1',
        name: 'Platform Team',
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      vi.mocked(repo.delete).mockResolvedValue({} as never);

      await teamService.delete('team-1');

      expect(repo.findById).toHaveBeenCalledWith('team-1');
      expect(repo.delete).toHaveBeenCalledWith('team-1');
    });

    it('throws when team not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(teamService.delete('missing')).rejects.toThrow('Team not found');
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns list of teams', async () => {
      const teams = [
        {
          id: 'team-1',
          name: 'Platform Team',
          externalId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'team-2',
          name: 'Payments Team',
          externalId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      vi.mocked(repo.list).mockResolvedValue(teams as never);

      const result = await teamService.list();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Platform Team');
      expect(repo.list).toHaveBeenCalled();
    });
  });
});
