import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplicationSource, ApplicationType } from '@prisma/client';
import { applicationService } from './applicationService.js';

vi.mock('../repositories/applicationRepository.js', () => ({
  applicationRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByExternalId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  },
}));

import * as applicationRepository from '../repositories/applicationRepository.js';

const repo = applicationRepository.applicationRepository;

describe('applicationService', () => {
  beforeEach(() => {
    vi.mocked(repo.findById).mockReset();
    vi.mocked(repo.findByExternalId).mockReset();
    vi.mocked(repo.create).mockReset();
    vi.mocked(repo.update).mockReset();
    vi.mocked(repo.delete).mockReset();
  });

  describe('create', () => {
    it('creates application when externalId is not duplicated', async () => {
      vi.mocked(repo.findByExternalId).mockResolvedValue(null);
      vi.mocked(repo.create).mockResolvedValue({
        id: 'app-1',
        name: 'My App',
        description: null,
        type: ApplicationType.Custom,
        externalId: null,
        source: ApplicationSource.manual,
        dimensions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await applicationService.create({
        name: 'My App',
        type: ApplicationType.Custom,
      });

      expect(result.name).toBe('My App');
      expect(repo.create).toHaveBeenCalledWith({
        name: 'My App',
        type: ApplicationType.Custom,
        description: undefined,
        externalId: undefined,
        source: undefined,
        dimensions: undefined,
      });
    });

    it('throws when externalId already exists', async () => {
      vi.mocked(repo.findByExternalId).mockResolvedValue({
        id: 'other',
        name: 'Other',
        description: null,
        type: ApplicationType.Custom,
        externalId: 'ext-1',
        source: ApplicationSource.servicenow,
        dimensions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      await expect(
        applicationService.create({ name: 'New', type: ApplicationType.Custom, externalId: 'ext-1' })
      ).rejects.toThrow(/already exists/);

      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('returns application when found', async () => {
      const app = {
        id: 'app-1',
        name: 'My App',
        description: null,
        type: ApplicationType.Custom,
        externalId: null,
        source: ApplicationSource.manual,
        dimensions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        teams: [],
        assessments: [],
      };
      vi.mocked(repo.findById).mockResolvedValue(app as never);

      const result = await applicationService.getById('app-1');
      expect(result.name).toBe('My App');
    });

    it('throws when not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(applicationService.getById('missing')).rejects.toThrow('Application not found');
    });
  });
});
