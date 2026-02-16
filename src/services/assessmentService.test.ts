import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assessmentService } from './assessmentService.js';

vi.mock('../repositories/assessmentRepository.js', () => ({
  assessmentRepository: {
    create: vi.fn(),
    listByApplication: vi.fn(),
  },
}));

vi.mock('../repositories/applicationRepository.js', () => ({
  applicationRepository: {
    findById: vi.fn(),
  },
}));

import * as assessmentRepository from '../repositories/assessmentRepository.js';
import * as applicationRepository from '../repositories/applicationRepository.js';

const repo = assessmentRepository.assessmentRepository;
const appRepo = applicationRepository.applicationRepository;

describe('assessmentService', () => {
  beforeEach(() => {
    vi.mocked(repo.create).mockReset();
    vi.mocked(repo.listByApplication).mockReset();
    vi.mocked(appRepo.findById).mockReset();
  });

  describe('getAssessmentsForApplication', () => {
    it('returns list of assessments for application', async () => {
      const list = [
        { id: 'a1', applicationId: 'app1', teamId: null, scoresSnapshot: { rp1: 1 }, assessmentDate: new Date(), updatedAt: new Date(), team: null },
      ];
      vi.mocked(repo.listByApplication).mockResolvedValue(list as never);

      const result = await assessmentService.getAssessmentsForApplication('app1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a1');
      expect(repo.listByApplication).toHaveBeenCalledWith('app1');
    });
  });

  describe('saveAssessment', () => {
    it('creates assessment with applicationId and optional teamId', async () => {
      vi.mocked(appRepo.findById).mockResolvedValue({
        id: 'app1',
        name: 'App',
        teams: [{ teamId: 'team1' }],
        assessments: [],
      } as never);
      vi.mocked(repo.create).mockResolvedValue({
        id: 'a1',
        applicationId: 'app1',
        teamId: 'team1',
        scoresSnapshot: { rp1: 2 },
        assessmentDate: new Date(),
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      await assessmentService.saveAssessment('app1', { rp1: 2 }, 'team1');

      expect(appRepo.findById).toHaveBeenCalledWith('app1');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 'app1',
          teamId: 'team1',
          scoresSnapshot: { rp1: 2 },
          status: 'completed',
        })
      );
    });

    it('creates application-level assessment when teamId is null', async () => {
      vi.mocked(appRepo.findById).mockResolvedValue({
        id: 'app1',
        name: 'App',
        teams: [],
        assessments: [],
      } as never);
      vi.mocked(repo.create).mockResolvedValue({} as never);

      await assessmentService.saveAssessment('app1', { rp1: 0 }, null);

      expect(appRepo.findById).toHaveBeenCalledWith('app1');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 'app1',
          teamId: null,
          scoresSnapshot: { rp1: 0 },
        })
      );
    });
  });
});
