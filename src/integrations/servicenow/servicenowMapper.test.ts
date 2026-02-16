import { describe, it, expect } from 'vitest';
import { ApplicationType } from '@prisma/client';
import {
  mapServiceNowCIToApplication,
  mapServiceNowGroupToTeam,
  extractTeamFromCI,
  type ServiceNowCI,
  type ServiceNowGroup,
} from './servicenowMapper.js';

describe('servicenowMapper', () => {
  describe('mapServiceNowCIToApplication', () => {
    it('maps ServiceNow CI to Application', () => {
      const ci: ServiceNowCI = {
        sys_id: 'abc123',
        name: 'Test Application',
        u_application_type: 'Custom',
        short_description: 'Test description',
      };

      const result = mapServiceNowCIToApplication(ci);

      expect(result).toEqual({
        externalId: 'abc123',
        name: 'Test Application',
        description: 'Test description',
        type: ApplicationType.Custom,
      });
    });

    it('maps SaaS type correctly', () => {
      const ci: ServiceNowCI = {
        sys_id: 'abc123',
        name: 'SaaS App',
        u_application_type: 'SaaS',
      };

      const result = mapServiceNowCIToApplication(ci);
      expect(result.type).toBe(ApplicationType.SaaS);
    });

    it('maps COTS type correctly', () => {
      const ci: ServiceNowCI = {
        sys_id: 'abc123',
        name: 'COTS App',
        u_application_type: 'COTS',
      };

      const result = mapServiceNowCIToApplication(ci);
      expect(result.type).toBe(ApplicationType.COTS);
    });

    it('defaults to Custom when type is unknown', () => {
      const ci: ServiceNowCI = {
        sys_id: 'abc123',
        name: 'Unknown App',
        u_application_type: 'Unknown',
      };

      const result = mapServiceNowCIToApplication(ci);
      expect(result.type).toBe(ApplicationType.Custom);
    });
  });

  describe('mapServiceNowGroupToTeam', () => {
    it('maps ServiceNow group to Team', () => {
      const group: ServiceNowGroup = {
        sys_id: 'team123',
        name: 'Development Team',
      };

      const result = mapServiceNowGroupToTeam(group);

      expect(result).toEqual({
        externalId: 'team123',
        name: 'Development Team',
      });
    });
  });

  describe('extractTeamFromCI', () => {
    it('extracts team info from CI', () => {
      const ci: ServiceNowCI = {
        sys_id: 'abc123',
        name: 'App',
        u_team: 'team123',
        u_team_name: 'Dev Team',
      };

      const result = extractTeamFromCI(ci);

      expect(result).toEqual({
        sysId: 'team123',
        name: 'Dev Team',
      });
    });

    it('returns null when no team info', () => {
      const ci: ServiceNowCI = {
        sys_id: 'abc123',
        name: 'App',
      };

      const result = extractTeamFromCI(ci);
      expect(result).toBeNull();
    });
  });
});
