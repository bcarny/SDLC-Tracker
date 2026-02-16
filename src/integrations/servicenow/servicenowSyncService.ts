import { ApplicationSource } from '@prisma/client';
import { ServiceNowClient } from './servicenowClient.js';
import type { ServiceNowCI, ServiceNowGroup } from './servicenowMapper.js';
import { mapServiceNowCIToApplication, mapServiceNowGroupToTeam, extractTeamFromCI } from './servicenowMapper.js';
import { applicationRepository } from '../../repositories/applicationRepository.js';
import { teamRepository } from '../../repositories/teamRepository.js';
import { applicationService } from '../../services/applicationService.js';

export interface SyncResult {
  applicationsCreated: number;
  applicationsUpdated: number;
  teamsCreated: number;
  teamsUpdated: number;
  errors: string[];
}

export class ServiceNowSyncService {
  private client: ServiceNowClient;

  constructor(client?: ServiceNowClient) {
    this.client = client || new ServiceNowClient();
  }

  async syncApplicationsFromServiceNow(
    tableName = 'cmdb_ci_appl',
    query?: string,
    preserveManualEdits = true
  ): Promise<SyncResult> {
    const result: SyncResult = {
      applicationsCreated: 0,
      applicationsUpdated: 0,
      teamsCreated: 0,
      teamsUpdated: 0,
      errors: [],
    };

    try {
      // Fetch CIs from ServiceNow
      const cis = await this.client.getPaginated<ServiceNowCI>(tableName, query);

      // Process each CI
      for (const ci of cis) {
        try {
          const appData = mapServiceNowCIToApplication(ci);

          // Check if application already exists by externalId
          const existing = await applicationRepository.findByExternalId(appData.externalId);

          if (existing) {
            // Update existing application
            if (!preserveManualEdits || existing.source === ApplicationSource.servicenow) {
              await applicationRepository.update(existing.id, {
                ...appData,
                source: ApplicationSource.servicenow,
              });
              result.applicationsUpdated++;
            }
            // If preserveManualEdits is true and source is manual, skip update
          } else {
            // Create new application
            await applicationRepository.create({
              ...appData,
              source: ApplicationSource.servicenow,
            });
            result.applicationsCreated++;
          }

          // Handle team association if present
          const teamInfo = extractTeamFromCI(ci);
          if (teamInfo && existing) {
            try {
              // Check if team exists
              let team = await teamRepository.findByExternalId(teamInfo.sysId);
              if (!team) {
                // Create team if it doesn't exist
                team = await teamRepository.create({
                  externalId: teamInfo.sysId,
                  name: teamInfo.name,
                });
                result.teamsCreated++;
              }

              // Link team to application if not already linked
              const app = await applicationRepository.findById(existing.id);
              const isLinked = app?.teams?.some((at) => at.teamId === team.id);
              if (!isLinked) {
                await applicationService.addTeamToApplication(existing.id, team.id);
              }
            } catch (teamError) {
              result.errors.push(`Failed to sync team for application ${ci.name}: ${teamError instanceof Error ? teamError.message : String(teamError)}`);
            }
          }
        } catch (error) {
          result.errors.push(`Failed to sync application ${ci.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to fetch applications from ServiceNow: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  async syncTeamsFromServiceNow(tableName = 'sys_user_group', query?: string): Promise<SyncResult> {
    const result: SyncResult = {
      applicationsCreated: 0,
      applicationsUpdated: 0,
      teamsCreated: 0,
      teamsUpdated: 0,
      errors: [],
    };

    try {
      // Fetch groups from ServiceNow
      const groups = await this.client.getPaginated<ServiceNowGroup>(tableName, query);

      // Process each group
      for (const group of groups) {
        try {
          const teamData = mapServiceNowGroupToTeam(group);

          // Check if team already exists by externalId
          const existing = await teamRepository.findByExternalId(teamData.externalId);

          if (existing) {
            // Update existing team
            await teamRepository.update(existing.id, teamData);
            result.teamsUpdated++;
          } else {
            // Create new team
            await teamRepository.create(teamData);
            result.teamsCreated++;
          }
        } catch (error) {
          result.errors.push(`Failed to sync team ${group.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to fetch teams from ServiceNow: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  async syncAssessmentsToServiceNow(
    applicationId: string,
    tableName = 'u_sdlc_maturity_assessment'
  ): Promise<void> {
    const app = await applicationRepository.findById(applicationId);
    if (!app || !app.externalId) {
      throw new Error('Application not found or does not have an externalId');
    }

    // Get latest assessment for the application
    const assessments = app.assessments || [];
    const latestAssessment = assessments
      .filter((a) => !a.teamId)
      .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0];

    if (!latestAssessment || !latestAssessment.scoresSnapshot) {
      throw new Error('No assessment found for this application');
    }

    // Calculate overall score
    const scores = latestAssessment.scoresSnapshot as Record<string, number>;
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const maxScore = Object.keys(scores).length * 4;
    const overallScore = Math.round((totalScore / maxScore) * 100);

    // Determine maturity level
    let maturityLevel = 'Baseline';
    if (overallScore >= 80) maturityLevel = 'Innovative';
    else if (overallScore >= 60) maturityLevel = 'Advanced';
    else if (overallScore >= 40) maturityLevel = 'Intermediate';
    else if (overallScore >= 20) maturityLevel = 'Evolving';

    // Create or update assessment record in ServiceNow
    const assessmentData = {
      u_application: app.externalId,
      u_assessment_date: latestAssessment.assessmentDate.toISOString(),
      u_overall_score: overallScore,
      u_maturity_level: maturityLevel,
      u_scores_snapshot: JSON.stringify(scores),
      u_status: latestAssessment.status,
    };

    // Try to find existing assessment record
    try {
      const existing = await this.client.get(tableName, `u_application=${app.externalId}`);
      if (existing.length > 0) {
        await this.client.put(tableName, existing[0].sys_id, assessmentData);
      } else {
        await this.client.post(tableName, assessmentData);
      }
    } catch (error) {
      throw new Error(`Failed to sync assessment to ServiceNow: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
