import { describe, it, expect } from 'vitest';
import {
  createPowerBIDatasetSchema,
  mapApplicationToPowerBI,
  mapAssessmentToPowerBI,
  mapTeamToPowerBI,
  mapApplicationTeamToPowerBI,
  calculateMaturityScore,
  getMaturityLevel,
} from './powerbiMapper.js';
import { ApplicationType, ApplicationSource, AssessmentStatus } from '@prisma/client';

describe('powerbiMapper', () => {
  describe('createPowerBIDatasetSchema', () => {
    it('creates correct dataset schema', () => {
      const schema = createPowerBIDatasetSchema();

      expect(schema).toHaveLength(4);
      expect(schema[0].name).toBe('Applications');
      expect(schema[1].name).toBe('Assessments');
      expect(schema[2].name).toBe('Teams');
      expect(schema[3].name).toBe('ApplicationTeams');
    });
  });

  describe('mapApplicationToPowerBI', () => {
    it('maps application to PowerBI row', () => {
      const app = {
        id: 'app1',
        name: 'Test App',
        type: ApplicationType.Custom,
        description: 'Test description',
        externalId: 'ext123',
        source: ApplicationSource.manual,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const result = mapApplicationToPowerBI(app as any);

      expect(result.ApplicationId).toBe('app1');
      expect(result.Name).toBe('Test App');
      expect(result.Type).toBe('Custom');
      expect(result.Description).toBe('Test description');
    });
  });

  describe('mapAssessmentToPowerBI', () => {
    it('maps assessment to PowerBI row', () => {
      const assessment = {
        id: 'assess1',
        applicationId: 'app1',
        teamId: null,
        assessmentDate: new Date('2024-01-01'),
        scoresSnapshot: { rp1: 2, rp2: 3 },
        status: AssessmentStatus.completed,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const result = mapAssessmentToPowerBI(assessment as any, 62, 'Advanced');

      expect(result.AssessmentId).toBe('assess1');
      expect(result.ApplicationId).toBe('app1');
      expect(result.OverallScore).toBe(62);
      expect(result.MaturityLevel).toBe('Advanced');
    });
  });

  describe('calculateMaturityScore', () => {
    it('calculates score correctly', () => {
      const scores = { rp1: 2, rp2: 3, da1: 1 };
      const score = calculateMaturityScore(scores);
      // (2 + 3 + 1) / (3 * 4) * 100 = 50
      expect(score).toBe(50);
    });

    it('returns 0 for empty scores', () => {
      expect(calculateMaturityScore({})).toBe(0);
      expect(calculateMaturityScore(null)).toBe(0);
    });
  });

  describe('getMaturityLevel', () => {
    it('returns correct maturity levels', () => {
      expect(getMaturityLevel(85)).toBe('Innovative');
      expect(getMaturityLevel(65)).toBe('Advanced');
      expect(getMaturityLevel(45)).toBe('Intermediate');
      expect(getMaturityLevel(25)).toBe('Evolving');
      expect(getMaturityLevel(10)).toBe('Baseline');
    });
  });
});
