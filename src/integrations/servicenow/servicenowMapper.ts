import { ApplicationType } from '@prisma/client';

export interface ServiceNowCI {
  sys_id: string;
  name: string;
  u_application_type?: string;
  short_description?: string;
  description?: string;
  sys_updated_on?: string;
  assigned_to?: {
    value: string;
    display_value: string;
  };
  u_team?: string;
  u_team_name?: string;
}

export interface ServiceNowGroup {
  sys_id: string;
  name: string;
  email?: string;
  active?: boolean;
}

export function mapServiceNowCIToApplication(ci: ServiceNowCI): {
  externalId: string;
  name: string;
  description: string | null;
  type: ApplicationType;
} {
  // Map ServiceNow application type to AppCompass type
  let type: ApplicationType = ApplicationType.Custom;
  const snType = ci.u_application_type?.toLowerCase();
  if (snType === 'saas' || snType === 'software as a service') {
    type = ApplicationType.SaaS;
  } else if (snType === 'cots' || snType === 'commercial off-the-shelf') {
    type = ApplicationType.COTS;
  }

  return {
    externalId: ci.sys_id,
    name: ci.name || 'Unnamed Application',
    description: ci.short_description || ci.description || null,
    type,
  };
}

export function mapServiceNowGroupToTeam(group: ServiceNowGroup): {
  externalId: string;
  name: string;
} {
  return {
    externalId: group.sys_id,
    name: group.name || 'Unnamed Team',
  };
}

export function extractTeamFromCI(ci: ServiceNowCI): { sysId: string; name: string } | null {
  if (ci.u_team) {
    return {
      sysId: ci.u_team,
      name: ci.u_team_name || 'Unnamed Team',
    };
  }
  return null;
}
