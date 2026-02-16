import type { Application, Team, Assessment } from '@prisma/client';

export interface PowerBITable {
  name: string;
  columns: Array<{
    name: string;
    dataType: string;
  }>;
}

export interface PowerBIRow {
  [key: string]: unknown;
}

export function createPowerBIDatasetSchema(): PowerBITable[] {
  return [
    {
      name: 'Applications',
      columns: [
        { name: 'ApplicationId', dataType: 'string' },
        { name: 'Name', dataType: 'string' },
        { name: 'Type', dataType: 'string' },
        { name: 'Description', dataType: 'string' },
        { name: 'ExternalId', dataType: 'string' },
        { name: 'Source', dataType: 'string' },
        { name: 'CreatedAt', dataType: 'datetime' },
        { name: 'UpdatedAt', dataType: 'datetime' },
      ],
    },
    {
      name: 'Assessments',
      columns: [
        { name: 'AssessmentId', dataType: 'string' },
        { name: 'ApplicationId', dataType: 'string' },
        { name: 'TeamId', dataType: 'string' },
        { name: 'AssessmentDate', dataType: 'datetime' },
        { name: 'OverallScore', dataType: 'int64' },
        { name: 'MaturityLevel', dataType: 'string' },
        { name: 'ScoresSnapshot', dataType: 'string' },
        { name: 'Status', dataType: 'string' },
        { name: 'CreatedAt', dataType: 'datetime' },
        { name: 'UpdatedAt', dataType: 'datetime' },
      ],
    },
    {
      name: 'Teams',
      columns: [
        { name: 'TeamId', dataType: 'string' },
        { name: 'Name', dataType: 'string' },
        { name: 'ExternalId', dataType: 'string' },
        { name: 'CreatedAt', dataType: 'datetime' },
        { name: 'UpdatedAt', dataType: 'datetime' },
      ],
    },
    {
      name: 'ApplicationTeams',
      columns: [
        { name: 'ApplicationId', dataType: 'string' },
        { name: 'TeamId', dataType: 'string' },
        { name: 'Role', dataType: 'string' },
        { name: 'CreatedAt', dataType: 'datetime' },
      ],
    },
  ];
}

export function mapApplicationToPowerBI(app: Application): PowerBIRow {
  return {
    ApplicationId: app.id,
    Name: app.name,
    Type: app.type,
    Description: app.description || '',
    ExternalId: app.externalId || '',
    Source: app.source,
    CreatedAt: app.createdAt.toISOString(),
    UpdatedAt: app.updatedAt.toISOString(),
  };
}

export function mapAssessmentToPowerBI(
  assessment: Assessment,
  overallScore: number,
  maturityLevel: string
): PowerBIRow {
  return {
    AssessmentId: assessment.id,
    ApplicationId: assessment.applicationId,
    TeamId: assessment.teamId || '',
    AssessmentDate: assessment.assessmentDate.toISOString(),
    OverallScore: overallScore,
    MaturityLevel: maturityLevel,
    ScoresSnapshot: JSON.stringify(assessment.scoresSnapshot || {}),
    Status: assessment.status,
    CreatedAt: assessment.createdAt.toISOString(),
    UpdatedAt: assessment.updatedAt.toISOString(),
  };
}

export function mapTeamToPowerBI(team: Team): PowerBIRow {
  return {
    TeamId: team.id,
    Name: team.name,
    ExternalId: team.externalId || '',
    CreatedAt: team.createdAt.toISOString(),
    UpdatedAt: team.updatedAt.toISOString(),
  };
}

export function mapApplicationTeamToPowerBI(
  applicationId: string,
  teamId: string,
  role: string,
  createdAt: Date
): PowerBIRow {
  return {
    ApplicationId: applicationId,
    TeamId: teamId,
    Role: role,
    CreatedAt: createdAt.toISOString(),
  };
}

export function calculateMaturityScore(scoresSnapshot: Record<string, number> | null): number {
  if (!scoresSnapshot || Object.keys(scoresSnapshot).length === 0) return 0;
  const totalScore = Object.values(scoresSnapshot).reduce((sum, score) => sum + score, 0);
  const maxScore = Object.keys(scoresSnapshot).length * 4;
  return Math.round((totalScore / maxScore) * 100);
}

export function getMaturityLevel(score: number): string {
  if (score >= 80) return 'Innovative';
  if (score >= 60) return 'Advanced';
  if (score >= 40) return 'Intermediate';
  if (score >= 20) return 'Evolving';
  return 'Baseline';
}
