import { describe, it, expect, vi, beforeEach } from 'vitest';
import { organizationService } from './organizationService.js';

vi.mock('../repositories/organizationRepository.js', () => ({
  organizationRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import * as organizationRepository from '../repositories/organizationRepository.js';

const repo = organizationRepository.organizationRepository;

describe('organizationService', () => {
  beforeEach(() => {
    vi.mocked(repo.create).mockReset();
    vi.mocked(repo.findById).mockReset();
    vi.mocked(repo.list).mockReset();
    vi.mocked(repo.update).mockReset();
    vi.mocked(repo.delete).mockReset();
  });

  describe('list', () => {
    it('returns organizations from repository', async () => {
      const orgs = [
        {
          id: 'org-1',
          name: 'Org 1',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'org-2',
          name: 'Org 2',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      vi.mocked(repo.list).mockResolvedValue(orgs as never);

      const result = await organizationService.list();

      expect(result).toEqual(orgs);
      expect(repo.list).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when repository returns empty', async () => {
      vi.mocked(repo.list).mockResolvedValue([] as never);

      const result = await organizationService.list();

      expect(result).toEqual([]);
      expect(repo.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('getById', () => {
    it('returns org when found', async () => {
      const org = {
        id: 'org-1',
        name: 'Default',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        applications: [],
        teams: [],
      };
      vi.mocked(repo.findById).mockResolvedValue(org as never);

      const result = await organizationService.getById('org-1');

      expect(result).toEqual(org);
      expect(repo.findById).toHaveBeenCalledWith('org-1');
    });

    it('throws when organization not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(organizationService.getById('missing')).rejects.toThrow(
        'Organization not found'
      );

      expect(repo.findById).toHaveBeenCalledWith('missing');
    });
  });

  describe('create', () => {
    it('creates organization via repository', async () => {
      const created = {
        id: 'org-1',
        name: 'New Org',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(repo.create).mockResolvedValue(created as never);

      const result = await organizationService.create({ name: 'New Org' });

      expect(result).toEqual(created);
      expect(repo.create).toHaveBeenCalledWith({ name: 'New Org' });
    });

    it('passes optional description', async () => {
      vi.mocked(repo.create).mockResolvedValue({
        id: 'org-1',
        name: 'O',
        description: 'Desc',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      await organizationService.create({ name: 'O', description: 'Desc' });

      expect(repo.create).toHaveBeenCalledWith({ name: 'O', description: 'Desc' });
    });
  });

  describe('update', () => {
    it('updates when org exists', async () => {
      const existing = {
        id: 'org-1',
        name: 'Old',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        applications: [],
        teams: [],
      };
      const updated = { ...existing, name: 'New' };
      vi.mocked(repo.findById).mockResolvedValue(existing as never);
      vi.mocked(repo.update).mockResolvedValue(updated as never);

      const result = await organizationService.update('org-1', { name: 'New' });

      expect(result.name).toBe('New');
      expect(repo.findById).toHaveBeenCalledWith('org-1');
      expect(repo.update).toHaveBeenCalledWith('org-1', { name: 'New' });
    });

    it('throws when organization not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(organizationService.update('missing', { name: 'New' })).rejects.toThrow(
        'Organization not found'
      );

      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes when org exists', async () => {
      const existing = {
        id: 'org-1',
        name: 'Org',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        applications: [],
        teams: [],
      };
      vi.mocked(repo.findById).mockResolvedValue(existing as never);
      vi.mocked(repo.delete).mockResolvedValue(existing as never);

      await organizationService.delete('org-1');

      expect(repo.findById).toHaveBeenCalledWith('org-1');
      expect(repo.delete).toHaveBeenCalledWith('org-1');
    });

    it('throws when organization not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(organizationService.delete('missing')).rejects.toThrow('Organization not found');

      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
