import { ApplicationSource, ApplicationType } from '@prisma/client';
import type { SearchFilters, SearchResult } from '../repositories/searchRepository.js';
import { searchRepository } from '../repositories/searchRepository.js';

export type SearchParams = {
  q: string;
  entityType?: string | string[];
  appType?: ApplicationType;
  appSource?: ApplicationSource;
  organizationId?: string;
};

export const searchService = {
  async search(params: SearchParams): Promise<SearchResult> {
    const entityTypes = normalizeEntityTypes(params.entityType);
    const filters: SearchFilters = {
      q: params.q.trim(),
      entityType: entityTypes,
      appType: params.appType,
      appSource: params.appSource,
      organizationId: params.organizationId,
    };
    return searchRepository.search(filters);
  },
};

function normalizeEntityTypes(
  value: string | string[] | undefined
): ('organization' | 'application' | 'team')[] {
  if (value == null || value === '') return ['organization', 'application', 'team'];
  const arr = Array.isArray(value) ? value : [value];
  const valid = new Set(['organization', 'application', 'team']);
  const filtered = arr.filter((v) => valid.has(String(v).toLowerCase())) as (
    | 'organization'
    | 'application'
    | 'team'
  )[];
  return filtered.length > 0 ? filtered : ['organization', 'application', 'team'];
}
