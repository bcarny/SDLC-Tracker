import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplicationSource, ApplicationType } from '@prisma/client';
import { ServiceNowSyncService } from './servicenowSyncService.js';
import { ServiceNowClient } from './servicenowClient.js';
import type { ServiceNowCI } from './servicenowMapper.js';

vi.mock('./servicenowClient.js');
vi.mock('../../repositories/applicationRepository.js');
vi.mock('../../repositories/organizationRepository.js');
vi.mock('../../repositories/teamRepository.js');
vi.mock('../../services/applicationService.js');

import * as applicationRepository from '../../repositories/applicationRepository.js';
import * as organizationRepository from '../../repositories/organizationRepository.js';
import * as teamRepository from '../../repositories/teamRepository.js';
import * as applicationService from '../../services/applicationService.js';

describe('ServiceNowSyncService', () => {
  let syncService: ServiceNowSyncService;
  let mockClient: ServiceNowClient;

  beforeEach(() => {
    mockClient = {
      getPaginated: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
    } as unknown as ServiceNowClient;

    syncService = new ServiceNowSyncService(mockClient);
    vi.mocked(applicationRepository.applicationRepository.findById).mockReset();
    vi.mocked(applicationRepository.applicationRepository.findByExternalId).mockReset();
    vi.mocked(applicationRepository.applicationRepository.create).mockReset();
    vi.mocked(applicationRepository.applicationRepository.update).mockReset();
    vi.mocked(organizationRepository.organizationRepository.findFirst).mockReset();
  });

  describe('syncApplicationsFromServiceNow', () => {
    it('creates new applications from ServiceNow', async () => {
      const cis: ServiceNowCI[] = [
        {
          sys_id: 'sn123',
          name: 'ServiceNow App',
          u_application_type: 'Custom',
          short_description: 'Test app',
        },
      ];

      vi.mocked(mockClient.getPaginated).mockResolvedValue(cis);
      vi.mocked(organizationRepository.organizationRepository.findFirst).mockResolvedValue({
        id: 'org-default',
        name: 'Default',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      vi.mocked(applicationRepository.applicationRepository.findByExternalId).mockResolvedValue(null);
      vi.mocked(applicationRepository.applicationRepository.create).mockResolvedValue({
        id: 'app1',
        organizationId: 'org-default',
        externalId: 'sn123',
        name: 'ServiceNow App',
        type: ApplicationType.Custom,
        source: ApplicationSource.servicenow,
      } as never);

      const result = await syncService.syncApplicationsFromServiceNow();

      expect(result.applicationsCreated).toBe(1);
      expect(result.applicationsUpdated).toBe(0);
      expect(applicationRepository.applicationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-default',
          externalId: 'sn123',
          name: 'ServiceNow App',
          source: ApplicationSource.servicenow,
        })
      );
    });

    it('updates existing applications', async () => {
      const cis: ServiceNowCI[] = [
        {
          sys_id: 'sn123',
          name: 'Updated App',
          u_application_type: 'SaaS',
        },
      ];

      const existingApp = {
        id: 'app1',
        externalId: 'sn123',
        name: 'Old Name',
        source: ApplicationSource.servicenow,
      };

      vi.mocked(mockClient.getPaginated).mockResolvedValue(cis);
      vi.mocked(applicationRepository.applicationRepository.findByExternalId).mockResolvedValue(existingApp as never);
      vi.mocked(applicationRepository.applicationRepository.update).mockResolvedValue({
        ...existingApp,
        name: 'Updated App',
      } as never);

      const result = await syncService.syncApplicationsFromServiceNow();

      expect(result.applicationsUpdated).toBe(1);
      expect(result.applicationsCreated).toBe(0);
      expect(applicationRepository.applicationRepository.update).toHaveBeenCalled();
    });

    it('preserves manual edits when preserveManualEdits is true', async () => {
      const cis: ServiceNowCI[] = [
        {
          sys_id: 'sn123',
          name: 'Updated App',
        },
      ];

      const existingApp = {
        id: 'app1',
        externalId: 'sn123',
        name: 'Manual App',
        source: ApplicationSource.manual,
      };

      vi.mocked(mockClient.getPaginated).mockResolvedValue(cis);
      vi.mocked(applicationRepository.applicationRepository.findByExternalId).mockResolvedValue(existingApp as never);

      const result = await syncService.syncApplicationsFromServiceNow(undefined, undefined, true);

      expect(result.applicationsUpdated).toBe(0);
      expect(applicationRepository.applicationRepository.update).not.toHaveBeenCalled();
    });
  });
});
