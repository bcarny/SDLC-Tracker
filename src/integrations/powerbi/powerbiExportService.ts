import { PowerBIClient } from './powerbiClient.js';
import {
  createPowerBIDatasetSchema,
  mapApplicationToPowerBI,
  mapAssessmentToPowerBI,
  mapTeamToPowerBI,
  mapApplicationTeamToPowerBI,
  calculateMaturityScore,
  getMaturityLevel,
} from './powerbiMapper.js';
import { applicationRepository } from '../../repositories/applicationRepository.js';
import { assessmentRepository } from '../../repositories/assessmentRepository.js';
import { teamRepository } from '../../repositories/teamRepository.js';

export interface ExportResult {
  datasetId: string;
  datasetName: string;
  applicationsExported: number;
  assessmentsExported: number;
  teamsExported: number;
  applicationTeamsExported: number;
  errors: string[];
}

export class PowerBIExportService {
  private client: PowerBIClient;
  private datasetName: string;

  constructor(client?: PowerBIClient, datasetName = 'SDLC Maturity Tracker') {
    this.client = client || new PowerBIClient();
    this.datasetName = datasetName;
  }

  async exportToPowerBI(clearExisting = false): Promise<ExportResult> {
    const result: ExportResult = {
      datasetId: '',
      datasetName: this.datasetName,
      applicationsExported: 0,
      assessmentsExported: 0,
      teamsExported: 0,
      applicationTeamsExported: 0,
      errors: [],
    };

    try {
      // Get or create dataset
      let datasetId = await this.findOrCreateDataset();

      if (clearExisting) {
        // Clear all tables
        const dataset = await this.client.getDataset(datasetId);
        for (const table of dataset.tables) {
          try {
            await this.client.clearRows(datasetId, table.name);
          } catch (error) {
            result.errors.push(`Failed to clear table ${table.name}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      result.datasetId = datasetId;

      // Export applications
      try {
        const applications = await applicationRepository.list();
        const appRows = applications.map(mapApplicationToPowerBI);
        if (appRows.length > 0) {
          await this.client.pushRows(datasetId, 'Applications', appRows);
          result.applicationsExported = appRows.length;
        }
      } catch (error) {
        result.errors.push(`Failed to export applications: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Export assessments
      try {
        const applications = await applicationRepository.list();
        const assessmentRows: Array<Record<string, unknown>> = [];

        for (const app of applications) {
          const assessments = await assessmentRepository.listByApplication(app.id);
          for (const assessment of assessments) {
            const scores = (assessment.scoresSnapshot as Record<string, number> | null) || {};
            const overallScore = calculateMaturityScore(scores);
            const maturityLevel = getMaturityLevel(overallScore);
            assessmentRows.push(mapAssessmentToPowerBI(assessment, overallScore, maturityLevel));
          }
        }

        if (assessmentRows.length > 0) {
          await this.client.pushRows(datasetId, 'Assessments', assessmentRows);
          result.assessmentsExported = assessmentRows.length;
        }
      } catch (error) {
        result.errors.push(`Failed to export assessments: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Export teams
      try {
        const teams = await teamRepository.list();
        const teamRows = teams.map(mapTeamToPowerBI);
        if (teamRows.length > 0) {
          await this.client.pushRows(datasetId, 'Teams', teamRows);
          result.teamsExported = teamRows.length;
        }
      } catch (error) {
        result.errors.push(`Failed to export teams: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Export application-team relationships
      try {
        const applications = await applicationRepository.list();
        const appTeamRows: Array<Record<string, unknown>> = [];

        for (const app of applications) {
          if (app.teams) {
            for (const appTeam of app.teams) {
              appTeamRows.push(
                mapApplicationTeamToPowerBI(
                  app.id,
                  appTeam.teamId,
                  appTeam.role,
                  appTeam.createdAt
                )
              );
            }
          }
        }

        if (appTeamRows.length > 0) {
          await this.client.pushRows(datasetId, 'ApplicationTeams', appTeamRows);
          result.applicationTeamsExported = appTeamRows.length;
        }
      } catch (error) {
        result.errors.push(`Failed to export application-teams: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      result.errors.push(`Failed to export to PowerBI: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  private async findOrCreateDataset(): Promise<string> {
    // Try to find existing dataset
    const datasets = await this.client.getDatasets();
    const existing = datasets.find((d) => d.name === this.datasetName);

    if (existing) {
      return existing.id;
    }

    // Create new dataset
    const schema = createPowerBIDatasetSchema();
    const newDataset = await this.client.createDataset(this.datasetName, schema);
    return newDataset.id;
  }
}
