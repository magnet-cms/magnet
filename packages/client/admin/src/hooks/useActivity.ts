import { useQuery } from '@tanstack/react-query'

import type {
  ActivityRecord,
  ActivitySearchParams,
  PaginatedActivities,
  VersionDiff,
} from '~/core/adapters/types'
import { useAdapter } from '~/core/provider/MagnetProvider'

// ============================================================================
// Query Keys
// ============================================================================

export const ACTIVITY_KEYS = {
  all: ['activity'] as const,
  recent: (limit?: number) => [...ACTIVITY_KEYS.all, 'recent', limit] as const,
  byEntity: (entityType: string, entityId: string, limit?: number) =>
    [...ACTIVITY_KEYS.all, 'entity', entityType, entityId, limit] as const,
  byUser: (userId: string, limit?: number) =>
    [...ACTIVITY_KEYS.all, 'user', userId, limit] as const,
  search: (params: ActivitySearchParams) => [...ACTIVITY_KEYS.all, 'search', params] as const,
}

export const VERSION_DIFF_KEYS = {
  all: ['versionDiff'] as const,
  compare: (versionId1: string, versionId2: string) =>
    [...VERSION_DIFF_KEYS.all, versionId1, versionId2] as const,
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch the most recent activity records.
 */
export function useRecentActivity(limit = 20) {
  const adapter = useAdapter()
  return useQuery<ActivityRecord[], Error>({
    queryKey: ACTIVITY_KEYS.recent(limit),
    queryFn: () => adapter.activity.getRecent(limit),
  })
}

/**
 * Fetch activity records for a specific entity.
 */
export function useEntityActivity(entityType: string, entityId: string, limit = 100) {
  const adapter = useAdapter()
  return useQuery<ActivityRecord[], Error>({
    queryKey: ACTIVITY_KEYS.byEntity(entityType, entityId, limit),
    queryFn: () => adapter.activity.getByEntity(entityType, entityId, limit),
    enabled: Boolean(entityType && entityId),
  })
}

/**
 * Fetch activity records by user ID.
 */
export function useUserActivity(userId: string, limit = 100) {
  const adapter = useAdapter()
  return useQuery<ActivityRecord[], Error>({
    queryKey: ACTIVITY_KEYS.byUser(userId, limit),
    queryFn: () => adapter.activity.getByUser(userId, limit),
    enabled: Boolean(userId),
  })
}

/**
 * Search activity records with optional filters and pagination.
 */
export function useActivitySearch(params: ActivitySearchParams) {
  const adapter = useAdapter()
  return useQuery<PaginatedActivities, Error>({
    queryKey: ACTIVITY_KEYS.search(params),
    queryFn: () => adapter.activity.search(params),
  })
}

/**
 * Compare two document versions and return a field-level diff.
 */
export function useVersionComparison(
  versionId1: string | undefined,
  versionId2: string | undefined,
) {
  const adapter = useAdapter()
  return useQuery<VersionDiff, Error>({
    queryKey: VERSION_DIFF_KEYS.compare(versionId1 ?? '', versionId2 ?? ''),
    queryFn: () => adapter.history.compareVersions(versionId1 ?? '', versionId2 ?? ''),
    enabled: Boolean(versionId1 && versionId2),
  })
}
