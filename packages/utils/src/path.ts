import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Options for findPathInParentDirectories function
 */
export interface FindPathOptions {
  /**
   * The base directory to start searching from (default: process.cwd())
   */
  baseDir?: string
  /**
   * Maximum parent directory levels to search (default: 5)
   */
  maxLevels?: number
}

/**
 * Search for a file/folder up to N parent directory levels from a base directory
 *
 * @param relativePath - The relative path to search for (e.g., 'packages/client/admin/dist/client')
 * @param options - Configuration options
 * @returns The resolved absolute path if found, null otherwise
 *
 * @example
 * // Search for 'packages/client/admin/dist/client' up to 5 levels from cwd
 * const adminPath = findPathInParentDirectories('packages/client/admin/dist/client')
 *
 * @example
 * // Search with custom base directory and max levels
 * const pluginPath = findPathInParentDirectories('packages/plugins/my-plugin', {
 *   baseDir: '/app/project',
 *   maxLevels: 3
 * })
 */
export function findPathInParentDirectories(
  relativePath: string,
  options?: FindPathOptions,
): string | null {
  const baseDir = options?.baseDir ?? process.cwd()
  const maxLevels = options?.maxLevels ?? 5

  let prefix = ''
  for (let level = 0; level <= maxLevels; level++) {
    const fullPath = resolve(baseDir, prefix, relativePath)
    if (existsSync(fullPath)) {
      return fullPath
    }
    prefix = prefix ? `${prefix}/..` : '..'
  }
  return null
}
