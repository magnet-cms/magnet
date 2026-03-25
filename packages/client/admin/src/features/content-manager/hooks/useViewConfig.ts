import { useCallback, useEffect, useRef, useState } from 'react'

import { useAdapter } from '~/core/provider/MagnetProvider'

// ============================================================================
// Types
// ============================================================================

export interface ViewConfigColumn {
  name: string
  visible: boolean
  order: number
}

export interface ViewConfig {
  columns: ViewConfigColumn[]
  pageSize: number
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  /** ISO date string — used to determine which data is newer (API vs localStorage) */
  updatedAt: string
}

const DEFAULT_PAGE_SIZE = 10

function buildDefault(): ViewConfig {
  return {
    columns: [],
    pageSize: DEFAULT_PAGE_SIZE,
    updatedAt: new Date(0).toISOString(),
  }
}

function storageKey(schema: string): string {
  return `magnet:view-config:${schema}`
}

function readFromStorage(schema: string): ViewConfig | null {
  try {
    const raw = localStorage.getItem(storageKey(schema))
    if (!raw) return null
    return JSON.parse(raw) as ViewConfig
  } catch {
    return null
  }
}

function writeToStorage(schema: string, config: ViewConfig): void {
  try {
    localStorage.setItem(storageKey(schema), JSON.stringify(config))
  } catch {
    // localStorage may be unavailable in some environments
  }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Manages view configuration for a content manager listing page.
 *
 * - Reads from localStorage instantly on mount (no loading flash)
 * - Fetches from API on mount and merges using `updatedAt` timestamps
 * - `updateConfig()` writes to localStorage immediately, then PUTs to API in the background
 * - `configVersion` increments on every save — use as `key` on DataTable to force remount
 */
export function useViewConfig(schema: string) {
  const adapter = useAdapter()

  const [config, setConfig] = useState<ViewConfig>(() => readFromStorage(schema) ?? buildDefault())
  const [isLoading, setIsLoading] = useState(true)
  const [configVersion, setConfigVersion] = useState(0)

  // Ref to avoid stale closure in the save callback
  const configRef = useRef(config)
  configRef.current = config

  // On mount: fetch from API and merge using updatedAt
  useEffect(() => {
    let cancelled = false

    async function fetchAndMerge() {
      try {
        const remote = await adapter.request<ViewConfig>(`/user-preferences/view-config/${schema}`)

        if (cancelled) return

        const local = readFromStorage(schema)
        const localDate = local ? new Date(local.updatedAt).getTime() : 0
        const remoteDate = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0

        if (remoteDate > localDate) {
          // API data is newer — overwrite localStorage and local state
          writeToStorage(schema, remote)
          setConfig(remote)
        } else if (local && localDate > remoteDate && localDate > 0) {
          // Local data is newer (e.g. saved while offline) — background-sync to API
          adapter
            .request(`/user-preferences/view-config/${schema}`, {
              method: 'PUT',
              body: local,
            })
            .catch(() => {
              // Sync failure is non-fatal — local data is preserved
            })
        }
      } catch {
        // API unavailable — continue with localStorage data
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchAndMerge()
    return () => {
      cancelled = true
    }
  }, [schema, adapter])

  /**
   * Persist updated config to localStorage immediately and sync to API in the background.
   * Increments `configVersion` to signal DataTable remount.
   */
  const updateConfig = useCallback(
    (updates: Partial<Omit<ViewConfig, 'updatedAt'>>) => {
      const next: ViewConfig = {
        ...configRef.current,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      writeToStorage(schema, next)
      setConfig(next)
      setConfigVersion((v) => v + 1)

      adapter
        .request(`/user-preferences/view-config/${schema}`, {
          method: 'PUT',
          body: next,
        })
        .catch(() => {
          // API save failure is non-fatal — localStorage is the source of truth
        })
    },
    [schema, adapter],
  )

  return { config, updateConfig, isLoading, configVersion }
}
