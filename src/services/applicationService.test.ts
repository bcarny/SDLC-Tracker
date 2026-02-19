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
    findByName: vi.fn(),
    addTeam: vi.fn(),
    removeTeam: vi.fn(),
  },
}));
vi.mock('../repositories/organizationRepository.js', () => ({
  organizationRepository: {
    findById: vi.fn(),
  },
}));
vi.mock('../repositories/teamRepository.js', () => ({
  teamRepository: {
    findById: vi.fn(),
  },
}));

import * as applicationRepository from '../repositories/applicationRepository.js';
import * as organizationRepository from '../repositories/organizationRepository.js';
import * as teamRepository from '../repositories/teamRepository.js';

const repo = applicationRepository.applicationRepository;
const orgRepo = organizationRepository.organizationRepository;
const teamRepo = teamRepository.teamRepository;

describe('applicationService', () => {
  beforeEach(() => {
    vi.mocked(orgRepo.findById).mockReset();
    vi.mocked(repo.findById).mockReset();
    vi.mocked(repo.findByExternalId).mockReset();
    vi.mocked(repo.create).mockReset();
    vi.mocked(repo.update).mockReset();
    vi.mocked(repo.delete).mockReset();
    vi.mocked(repo.addTeam).mockReset();
    vi.mocked(repo.removeTeam).mockReset();
  });

  describe('create', () => {
    it('creates application when externalId is not duplicated', async () => {
      vi.mocked(orgRepo.findById).mockResolvedValue({
        id: 'org-1',
        name: 'Default',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      vi.mocked(repo.findByExternalId).mockResolvedValue(null);
      vi.mocked(repo.create).mockResolvedValue({
        id: 'app-1',
        organizationId: 'org-1',
        name: 'My App',
        description: null,
        type: ApplicationType.Custom,
        externalId: null,
        source: ApplicationSource.manual,
        dimensions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await applicationService.create({
        organizationId: 'org-1',
        name: 'My App',
        type: ApplicationType.Custom,
      });

      expect(result.name).toBe('My App');
      expect(repo.create).toHaveBeenCalledWith({
        organizationId: 'org-1',
        name: 'My App',
        type: ApplicationType.Custom,
        description: undefined,
        externalId: undefined,
        source: undefined,
        dimensions: undefined,
      });
    });

    it('throws when organization not found', async () => {
      vi.mocked(orgRepo.findById).mockResolvedValue(null);

      await expect(
        applicationService.create({
          organizationId: 'bad-org',
          name: 'New',
          type: ApplicationType.Custom,
        })
      ).rejects.toThrow('Organization not found');

      expect(repo.create).not.toHaveBeenCalled();
    });

    it('throws when externalId already exists', async () => {
      vi.mocked(orgRepo.findById).mockResolvedValue({
        id: 'org-1',
        name: 'Default',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
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
        applicationService.create({
          organizationId: 'org-1',
          name: 'New',
          type: ApplicationType.Custom,
          externalId: 'ext-1',
        })
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

  describe('update', () => {
    it('updates application name successfully', async () => {
      vi.mocked(repo.findById).mockResolvedValue({
        id: 'app-1',
        name: 'Old Name',
        description: null,
        type: ApplicationType.Custom,
        externalId: null,
        source: ApplicationSource.manual,
        dimensions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        teams: [],
        assessments: [],
      } as never);
      vi.mocked(repo.update).mockResolvedValue({
        id: 'app-1',
        name: 'New Name',
        description: null,
        type: ApplicationType.Custom,
        externalId: null,
        source: ApplicationSource.manual,
        dimensions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await applicationService.update('app-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(repo.findById).toHaveBeenCalledWith('app-1');
      expect(repo.update).toHaveBeenCalledWith('app-1', { name: 'New Name' });
    });

    it('throws when application not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(applicationService.update('missing', { name: 'New Name' })).rejects.toThrow(
        'Application not found'
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('throws when externalId already exists on another application', async () => {
      vi.mocked(repo.findById).mockResolvedValue({
        id: 'app-1',
        name: 'App',
        externalId: null,
        teams: [],
        assessments: [],
      } as never);
      vi.mocked(repo.findByExternalId).mockResolvedValue({
        id: 'other-app',
        name: 'Other',
        externalId: 'ext-1',
        teams: [],
        assessments: [],
      } as never);

      await expect(applicationService.update('app-1', { externalId: 'ext-1' })).rejects.toThrow(
        /already exists/
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('allows updating externalId to same value', async () => {
      vi.mocked(repo.findById).mockResolvedValue({
        id: 'app-1',
        name: 'App',
        externalId: 'ext-1',
        teams: [],
        assessments: [],
      } as never);
      vi.mocked(repo.findByExternalId).mockResolvedValue({
        id: 'app-1',
        name: 'App',
        externalId: 'ext-1',
        teams: [],
        assessments: [],
      } as never);
      vi.mocked(repo.update).mockResolvedValue({
        id: 'app-1',
        name: 'App',
        externalId: 'ext-1',
        teams: [],
        assessments: [],
      } as never);

      await applicationService.update('app-1', { externalId: 'ext-1' });

      expect(repo.update).toHaveBeenCalled();
    });
  });

  describe('addTeamToApplication', () => {
    it('adds team when application and team exist and team is not already linked', async () => {
      vi.mocked(repo.findById).mockResolvedValue({
        id: 'app-1',
        name: 'App',
        teams: [],
        assessments: [],
      } as never);
      vi.mocked(teamRepo.findById).mockResolvedValue({ id: 'team-1', name: 'Team 1' } as never);
      vi.mocked(repo.addTeam).mockResolvedValue({
        applicationId: 'app-1',
        teamId: 'team-1',
        team: { name: 'Team 1' },
      } as never);

      await applicationService.addTeamToApplication('app-1', 'team-1');

      expect(repo.addTeam).toHaveBeenCalledWith('app-1', 'team-1', 'supporting');
    });

    it('throws when team is already linked', async () => {
      vi.mocked(repo.findById).mockResolvedValue({
        id: 'app-1',
        name: 'App',
        teams: [{ teamId: 'team-1' }],
        assessments: [],
      } as never);
      vi.mocked(teamRepo.findById).mockResolvedValue({ id: 'team-1', name: 'Team 1' } as never);

      await expect(applicationService.addTeamToApplication('app-1', 'team-1')).rejects.toThrow(
        /already linked/
      );
      expect(repo.addTeam).not.toHaveBeenCalled();
    });
  });
});
