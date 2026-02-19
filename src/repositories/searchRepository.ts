import { ApplicationSource, ApplicationType, Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';

export type SearchFilters = {
  q: string;
  entityType?: ('organization' | 'application' | 'team')[];
  appType?: ApplicationType;
  appSource?: ApplicationSource;
  organizationId?: string;
};

export type SearchOrganizationResult = {
  id: string;
  name: string;
  description: string | null;
  matchType: string;
};

export type SearchApplicationResult = {
  id: string;
  name: string;
  description: string | null;
  type: ApplicationType;
  organizationId: string;
  organizationName: string;
  matchType?: string;
};

export type SearchTeamResult = {
  id: string;
  name: string;
  organizationId: string | null;
  organizationName: string | null;
  matchType?: string;
};

export type SearchResult = {
  organizations: SearchOrganizationResult[];
  applications: SearchApplicationResult[];
  teams: SearchTeamResult[];
};

export const searchRepository = {
  async search(filters: SearchFilters): Promise<SearchResult> {
    const {
      q,
      entityType = ['organization', 'application', 'team'],
      appType,
      appSource,
      organizationId,
    } = filters;
    const trimmed = q.trim();
    if (!trimmed) {
      return { organizations: [], applications: [], teams: [] };
    }

    const searchTypes = Array.isArray(entityType) ? entityType : [entityType];

    const result: SearchResult = {
      organizations: [],
      applications: [],
      teams: [],
    };

    try {
      if (searchTypes.includes('organization')) {
        result.organizations = await this.searchOrganizations(trimmed);
      }
      if (searchTypes.includes('application')) {
        result.applications = await this.searchApplications(trimmed, {
          appType,
          appSource,
          organizationId,
        });
      }
      if (searchTypes.includes('team')) {
        result.teams = await this.searchTeams(trimmed, { organizationId });
      }
    } catch {
      // Fallback to keyword-only if pg_trgm fails (extension not installed)
      if (searchTypes.includes('organization')) {
        result.organizations = await this.searchOrganizationsKeyword(trimmed);
      }
      if (searchTypes.includes('application')) {
        result.applications = await this.searchApplicationsKeyword(trimmed, {
          appType,
          appSource,
          organizationId,
        });
      }
      if (searchTypes.includes('team')) {
        result.teams = await this.searchTeamsKeyword(trimmed, { organizationId });
      }
    }

    return result;
  },

  async searchOrganizations(q: string): Promise<SearchOrganizationResult[]> {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; name: string; description: string | null; match_type: string }>
    >`
      SELECT o.id, o.name, o.description,
        CASE
          WHEN similarity(o.name, ${q}) > 0.2 OR o.name % ${q} THEN 'name'
          WHEN o.description IS NOT NULL AND (similarity(o.description, ${q}) > 0.2 OR o.description % ${q}) THEN 'description'
          ELSE 'name'
        END as match_type
      FROM organizations o
      WHERE o.name ILIKE ${'%' + q + '%'}
         OR (o.description IS NOT NULL AND o.description ILIKE ${'%' + q + '%'})
         OR similarity(o.name, ${q}) > 0.2
         OR o.name % ${q}
         OR (o.description IS NOT NULL AND (similarity(o.description, ${q}) > 0.2 OR o.description % ${q}))
      ORDER BY similarity(o.name, ${q}) DESC NULLS LAST, o.name ASC
      LIMIT 20
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      matchType: r.match_type,
    }));
  },

  async searchOrganizationsKeyword(q: string): Promise<SearchOrganizationResult[]> {
    const pattern = { contains: q, mode: 'insensitive' as const };
    const rows = await prisma.organization.findMany({
      where: {
        OR: [{ name: pattern }, { description: pattern }],
      },
      orderBy: { name: 'asc' },
      take: 20,
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      matchType: 'name',
    }));
  },

  async searchApplications(
    q: string,
    facets?: { appType?: ApplicationType; appSource?: ApplicationSource; organizationId?: string }
  ): Promise<SearchApplicationResult[]> {
    const orgFilter = facets?.organizationId
      ? Prisma.sql`AND a.organization_id = ${facets.organizationId}`
      : Prisma.empty;
    const typeFilter = facets?.appType ? Prisma.sql`AND a.type = ${facets.appType}` : Prisma.empty;
    const sourceFilter = facets?.appSource
      ? Prisma.sql`AND a.source = ${facets.appSource}`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        description: string | null;
        type: ApplicationType;
        organization_id: string;
        organization_name: string;
      }>
    >`
      SELECT a.id, a.name, a.description, a.type, a.organization_id, o.name as organization_name
      FROM applications a
      JOIN organizations o ON o.id = a.organization_id
      WHERE (a.name ILIKE ${'%' + q + '%'}
         OR (a.description IS NOT NULL AND a.description ILIKE ${'%' + q + '%'})
         OR (a.external_id IS NOT NULL AND a.external_id ILIKE ${'%' + q + '%'})
         OR similarity(a.name, ${q}) > 0.2
         OR a.name % ${q}
         OR (a.description IS NOT NULL AND (similarity(a.description, ${q}) > 0.2 OR a.description % ${q})))
      ${orgFilter}
      ${typeFilter}
      ${sourceFilter}
      ORDER BY similarity(a.name, ${q}) DESC NULLS LAST, a.name ASC
      LIMIT 20
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      type: r.type,
      organizationId: r.organization_id,
      organizationName: r.organization_name,
    }));
  },

  async searchApplicationsKeyword(
    q: string,
    facets?: { appType?: ApplicationType; appSource?: ApplicationSource; organizationId?: string }
  ): Promise<SearchApplicationResult[]> {
    const pattern = { contains: q, mode: 'insensitive' as const };
    const where: Prisma.ApplicationWhereInput = {
      OR: [{ name: pattern }, { description: pattern }, { externalId: pattern }],
    };
    if (facets?.organizationId) where.organizationId = facets.organizationId;
    if (facets?.appType) where.type = facets.appType;
    if (facets?.appSource) where.source = facets.appSource;

    const rows = await prisma.application.findMany({
      where,
      include: { organization: true },
      orderBy: { name: 'asc' },
      take: 20,
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      type: r.type,
      organizationId: r.organizationId,
      organizationName: r.organization.name,
    }));
  },

  async searchTeams(q: string, facets?: { organizationId?: string }): Promise<SearchTeamResult[]> {
    const orgFilter = facets?.organizationId
      ? Prisma.sql`AND t.organization_id = ${facets.organizationId}`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        organization_id: string | null;
        organization_name: string | null;
      }>
    >`
      SELECT t.id, t.name, t.organization_id, o.name as organization_name
      FROM teams t
      LEFT JOIN organizations o ON o.id = t.organization_id
      WHERE (t.name ILIKE ${'%' + q + '%'}
         OR (t.external_id IS NOT NULL AND t.external_id ILIKE ${'%' + q + '%'})
         OR similarity(t.name, ${q}) > 0.2
         OR t.name % ${q})
      ${orgFilter}
      ORDER BY similarity(t.name, ${q}) DESC NULLS LAST, t.name ASC
      LIMIT 20
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      organizationId: r.organization_id,
      organizationName: r.organization_name,
    }));
  },

  async searchTeamsKeyword(
    q: string,
    facets?: { organizationId?: string }
  ): Promise<SearchTeamResult[]> {
    const pattern = { contains: q, mode: 'insensitive' as const };
    const where: Prisma.TeamWhereInput = {
      OR: [{ name: pattern }, { externalId: pattern }],
    };
    if (facets?.organizationId) where.organizationId = facets.organizationId;

    const rows = await prisma.team.findMany({
      where,
      include: { organization: true },
      orderBy: { name: 'asc' },
      take: 20,
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      organizationId: r.organizationId,
      organizationName: r.organization?.name ?? null,
    }));
  },
};
