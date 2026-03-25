import type { DatabaseAdapter } from '~/types/database.types'

// globalThis + Symbol.for: @magnet-cms/core dist may bundle a second copy of
// common; module-level state would not be shared with adapter packages.
const GETTER_KEY = Symbol.for('@magnet-cms/common/database-adapter-singleton-for-feature')

function getGetterSlot(): (() => DatabaseAdapter) | null {
  const g = globalThis as Record<symbol, (() => DatabaseAdapter) | null | undefined>
  return (g[GETTER_KEY] as (() => DatabaseAdapter) | null | undefined) ?? null
}

function setGetterSlot(getter: (() => DatabaseAdapter) | null): void {
  const g = globalThis as Record<symbol, (() => DatabaseAdapter) | null | undefined>
  g[GETTER_KEY] = getter
}

/**
 * Register the getter that returns the same `DatabaseAdapter` singleton used by
 * the adapter’s `forRoot()` / `getInstance()`.
 *
 * **Why:** With Nest’s compiled CJS output, feature modules are often
 * `require()`’d before the `AppModule` class decorator runs
 * `MagnetModule.forRoot()`, so `DatabaseModule.register()` has not executed yet
 * and core cannot resolve the adapter from registration alone.
 *
 * Official packages `@magnet-cms/adapter-db-drizzle` and
 * `@magnet-cms/adapter-db-mongoose` call this from their entry `index.ts`.
 * Custom third-party DB adapters should register here if they see the same
 * load-order failure.
 */
export function registerDatabaseAdapterSingletonForFeature(getter: () => DatabaseAdapter): void {
  setGetterSlot(getter)
}

/**
 * @internal Used by `@magnet-cms/core` `DatabaseModule.forFeature` when
 * `DatabaseModule.register()` has not run yet.
 */
export function getDatabaseAdapterSingletonForFeature(): DatabaseAdapter | null {
  const databaseAdapterSingletonGetter = getGetterSlot()
  if (!databaseAdapterSingletonGetter) return null
  try {
    return databaseAdapterSingletonGetter()
  } catch {
    return null
  }
}

/** @internal Clear between isolated tests if needed */
export function clearDatabaseAdapterSingletonForFeature(): void {
  setGetterSlot(null)
}
