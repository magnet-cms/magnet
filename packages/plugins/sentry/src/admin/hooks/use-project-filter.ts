import type { useAdapter } from '@magnet-cms/admin'
import { useEffect, useState } from 'react'

export interface SentryProject {
  id: string
  slug: string
  name: string
  platform: string | null
  isActive: boolean
  errorCount: number | null
}

/** Sentinel value for the "All Projects" aggregate option */
export const ALL_PROJECTS = '__all__'

type Adapter = ReturnType<typeof useAdapter>

/**
 * Shared hook for project filter functionality used by Dashboard and Issues pages.
 *
 * Fetches the org's project list on mount, defaults to ALL_PROJECTS (aggregate view),
 * and invokes `onProjectChange` whenever the selection changes.
 * Pass ALL_PROJECTS ('') to get org-level aggregate data (no ?project= param).
 */
export function useProjectFilter(
  adapter: Adapter,
  onProjectChange: (slug: string) => Promise<void>,
) {
  const [projects, setProjects] = useState<SentryProject[]>([])
  const [selectedProject, setSelectedProject] = useState<string>(ALL_PROJECTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      try {
        const [projectsData] = await Promise.all([
          adapter.request<SentryProject[]>('/sentry/admin/projects'),
          // Initial data fetch for "All Projects"
          onProjectChange(ALL_PROJECTS),
        ])
        setProjects(projectsData)
      } catch (error) {
        console.error('[Sentry] Failed to load projects:', error)
      } finally {
        setLoading(false)
      }
    }
    init()
    // onProjectChange is intentionally excluded — stable callback ref not needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter])

  function handleProjectChange(slug: string) {
    setSelectedProject(slug)
    onProjectChange(slug).catch(console.error)
  }

  return { projects, selectedProject, loading, handleProjectChange }
}
