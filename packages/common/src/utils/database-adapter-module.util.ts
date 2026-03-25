import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

/**
 * Directories to try when resolving `@magnet-cms/adapter-db-*` packages.
 * Node resolves bare specifiers from the file that calls `require()`; common is
 * published under `packages/common/dist`, so the host app's `node_modules` is
 * never on the lookup path unless we anchor `require` at the application root.
 */
export function getDatabaseAdapterResolutionRoots(): string[] {
  const roots: string[] = []
  const seen = new Set<string>()

  const add = (dir: string) => {
    if (dir && !seen.has(dir)) {
      seen.add(dir)
      roots.push(dir)
    }
  }

  add(process.cwd())

  const main = typeof require !== 'undefined' ? require.main : undefined
  if (main?.filename) {
    const mainDir = dirname(main.filename)
    add(mainDir)
    add(join(mainDir, '..'))
  }

  return roots
}

/**
 * Load `@magnet-cms/adapter-db-${adapter}` from the consuming application's
 * dependency tree (not from `@magnet-cms/common`'s install location).
 */
export function requireDatabaseAdapterModule(
  adapter: 'mongoose' | 'drizzle',
): NodeModule['exports'] {
  const pkg = `@magnet-cms/adapter-db-${adapter}`

  for (const root of getDatabaseAdapterResolutionRoots()) {
    const manifestPath = join(root, 'package.json')
    if (!existsSync(manifestPath)) continue

    try {
      const req = createRequire(manifestPath)
      return req(pkg) as NodeModule['exports']
    } catch {
      // module not found in this root, try next
    }
  }

  throw new Error(
    `Cannot find module '${pkg}'. Install it in your application (e.g. bun add ${pkg}).`,
  )
}
