# Cache System Implementation Plan

Created: 2026-03-20
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Build a cache subsystem for Magnet CMS with an abstract `CacheAdapter` interface, a built-in in-memory adapter (zero-config default), a Redis adapter package (also covers Dragonfly), caching decorators (`@Cacheable`, `@CacheEvict`, `@CachePut`, `@CacheTTL`), and Settings integration for runtime config.

**Architecture:** Abstract `CacheAdapter` class in `@magnet-cms/common` (same pattern as `DatabaseAdapter`, `EmailAdapter`, etc.). Core `CacheModule` in `packages/core/src/modules/cache/` owns the DI wiring, `CacheService`, `CacheInterceptor`, decorators, and settings. The in-memory adapter is built into core (zero-config). Redis adapter lives in `packages/adapters/cache-redis/` as `@magnet-cms/adapter-cache-redis`. A `CacheMagnetProvider` type joins the `MagnetProvider` union for the `.forRoot()` registration pattern.

**Tech Stack:** NestJS (interceptors, metadata, DI), ioredis (Redis adapter), `@magnet-cms/common` types

## Scope

### In Scope

- `CacheAdapter` abstract class in `@magnet-cms/common`
- `CacheMagnetProvider` type in provider union
- `CacheModule` in core (service, interceptor, decorators, settings)
- Built-in `MemoryCacheAdapter` in core (LRU with TTL, max entries)
- `@magnet-cms/adapter-cache-redis` package (ioredis, covers Redis + Dragonfly)
- `@Cacheable()`, `@CacheEvict()`, `@CachePut()`, `@CacheTTL()` decorators
- `CacheSettings` with `@Settings` for runtime config (default TTL, max entries)
- Registration in `MagnetModule.forRoot()` pipeline
- Unit tests for all components

### Out of Scope

- Memcached adapter
- Cache warming / preloading
- Admin UI page for cache management (stats, flush)
- Distributed cache invalidation (pub/sub)
- E2E tests (internal service, no HTTP endpoints)
- Documentation pages

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Adapter pattern:** All adapters follow the same structure. Abstract class in `packages/common/src/types/` (see `email.types.ts:155`, `storage.types.ts:173`, `vault.types.ts:79`). Each adapter extends the abstract class and provides a static `forRoot()` that returns a typed `MagnetProvider` variant.

- **Provider registration:** `MagnetModule.forRoot(providers, globalOptions)` receives an array of `MagnetProvider` objects. Each provider has a `type` discriminant. The `categorizeProviders()` function in `packages/core/src/magnet.module.ts:33` groups them. The categorized cache provider gets passed to `buildMagnetImports()` in `packages/core/src/magnet-module-imports.ts:61` which wires up `CacheModule.forRoot(adapter)`.

- **Module wiring:** See `EmailModule.forRoot()` at `packages/core/src/modules/email/email.module.ts:28` as the closest pattern. It accepts an adapter (or null for default), creates providers, and returns a `DynamicModule`. Cache should follow identically.

- **Settings pattern:** Settings classes use `@Settings()` decorator from `@magnet-cms/common` with `@SettingField.*` property decorators. See `packages/core/src/modules/email/email.settings.ts` for the exact pattern. Register via `SettingsModule.forFeature(CacheSettings)` in the module imports.

- **Adapter package structure:** See `packages/adapters/email-resend/` — contains `src/index.ts`, `src/resend.adapter.ts`, `src/__tests__/`, `package.json`, `tsconfig.json`, `biome.json`, `tsup.config.ts`. Peer-depends on `@magnet-cms/common`.

- **Decorator + Interceptor pattern:** Caching decorators use `SetMetadata()` to attach cache config to methods. A `CacheInterceptor` (NestJS `NestInterceptor`) reads this metadata via `Reflector` and handles cache get/set/evict around the method call. See `packages/core/src/modules/rbac/guards/permission.guard.ts:112` for metadata reading pattern.

- **Conventions:** No `any` types. Biome for formatting. `bun:test` for unit tests. tsup for builds. Conventional commits.

- **Gotchas:**
  - Core `index.ts` only exports modules safe to load before `forRoot()`. Cache decorators can go in `index.ts` (no DB deps). `CacheModule` goes in `modules.ts`.
  - The `MagnetProvider` union in `packages/common/src/types/provider.types.ts` must be extended with `CacheMagnetProvider`.
  - `BuildImportsParams` interface in `magnet-module-imports.ts:40` needs a `cache?` field.
  - `MagnetModuleOptions` (legacy) in `config.types.ts:37` does NOT need cache — it's a legacy compat layer. Cache only uses the new provider pattern.

## Assumptions

- ioredis works with Dragonfly out of the box (Dragonfly is Redis wire-compatible) — supported by Dragonfly docs — Tasks 6 depends on this
- NestJS interceptors work at the controller/route handler level only (NOT on plain service methods) — `@Cacheable()` targets controller endpoint methods; for service-level caching, users call `CacheService` directly — Tasks 4, 5 depend on this
- `Map` with manual TTL tracking is sufficient for in-memory cache (no need for external LRU library) — Task 3 depends on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Cache key collisions across content types | Medium | High | Include content type name + method name + args hash in cache key pattern |
| Memory leaks in in-memory adapter | Medium | High | Enforce max entries with LRU eviction; periodic cleanup of expired entries |
| Redis connection failure crashes app startup | Low | High | Explicit failure: RedisCacheAdapter throws on connection failure during `healthCheck()` in module init. Users who want fallback can wrap in try/catch and pass `MemoryCacheAdapter` instead. No silent fallback — different caches across instances would cause subtle bugs. |
| Stale cache after content mutations | Medium | Medium | @CacheEvict on mutation methods; document that custom services need explicit eviction |

## Goal Verification

### Truths

1. A user can register `MemoryCacheAdapter` (or no cache adapter at all) and the app starts with working in-memory caching
2. A user can register `RedisCacheAdapter.forRoot()` and the app caches to Redis/Dragonfly
3. `@Cacheable()` on a method causes its return value to be cached on first call and returned from cache on subsequent calls with the same key
4. `@CacheEvict()` on a method removes the specified cache entries when the method is called
5. `@CachePut()` always executes the method and updates the cache
6. `@CacheTTL()` overrides the default TTL for a specific method
7. Cache settings (default TTL, max entries) are configurable via the admin Settings UI

### Artifacts

1. `packages/common/src/types/cache.types.ts` — CacheAdapter abstract class
2. `packages/common/src/types/provider.types.ts` — CacheMagnetProvider type
3. `packages/core/src/modules/cache/` — CacheModule, CacheService, CacheInterceptor, decorators, settings
4. `packages/adapters/cache-redis/` — RedisCacheAdapter package
5. Unit tests in both core and adapter packages

## Progress Tracking

- [x] Task 1: CacheAdapter types in @magnet-cms/common
- [x] Task 2: CacheMagnetProvider and MagnetModule integration
- [x] Task 3: Built-in MemoryCacheAdapter in core
- [x] Task 4: CacheModule, CacheService, and CacheSettings
- [x] Task 5: Caching decorators and CacheInterceptor
- [x] Task 6: @magnet-cms/adapter-cache-redis package
- [x] Task 7: Integration wiring and smoke tests

**Total Tasks:** 7 | **Completed:** 7 | **Remaining:** 0

## Implementation Tasks

### Task 1: CacheAdapter Types in @magnet-cms/common

**Objective:** Define the `CacheAdapter` abstract class and supporting types in the common package, following the exact pattern of `EmailAdapter`, `StorageAdapter`, etc.

**Dependencies:** None

**Files:**

- Create: `packages/common/src/types/cache.types.ts`
- Modify: `packages/common/src/types/index.ts`

**Key Decisions / Notes:**

- Follow `EmailAdapter` pattern at `packages/common/src/types/email.types.ts:155`
- Methods: `get<T>(key)`, `set<T>(key, value, ttl?)`, `delete(key)`, `deleteByPattern(pattern)`, `has(key)`, `clear()`, `healthCheck()`
- `deleteByPattern` enables evicting all keys matching a glob (e.g., `content:posts:*`)
- Abstract `readonly name: string` for adapter identification
- Optional `dispose()` for cleanup (like `EmailAdapter`)
- Export from `types/index.ts`

**Definition of Done:**

- [ ] `CacheAdapter` abstract class defined with all methods typed
- [ ] Types exported from `@magnet-cms/common`
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 2: CacheMagnetProvider and MagnetModule Integration

**Objective:** Add `CacheMagnetProvider` to the provider union and wire cache adapter handling into `MagnetModule.forRoot()` and `buildMagnetImports()`.

**Dependencies:** Task 1

**Files:**

- Modify: `packages/common/src/types/provider.types.ts`
- Modify: `packages/core/src/magnet.module.ts`
- Modify: `packages/core/src/magnet-module-imports.ts`

**Key Decisions / Notes:**

- Add `CacheMagnetProvider` with `type: 'cache'`, `adapter: CacheAdapter` — follow `EmailMagnetProvider` at `provider.types.ts:111`
- Add to `MagnetProvider` union at `provider.types.ts:172`
- Add `cache?: CacheMagnetProvider` to `categorizeProviders()` at `magnet.module.ts:33`
- **⚠️ Also extend the inline `require()` type cast in `magnet.module.ts` (lines ~167-187)** to include `cache?: CacheMagnetProvider` in the categorized type. Without this, TypeScript will silently drop the cache field when passing to `buildMagnetImports()`.
- Add `cache?` field to `BuildImportsParams` at `magnet-module-imports.ts:40`
- Wire `CacheModule.forRoot(categorized.cache?.adapter ?? null)` in `buildMagnetImports()` at `magnet-module-imports.ts:88`
- Import `CacheModule` in `magnet-module-imports.ts`
- **Add `CacheModuleConfig` to `MagnetModule.forRoot()` exports array** in `magnet.module.ts:220-235`, following the `StorageModuleConfig`/`VaultModuleConfig` pattern. Store the result of `CacheModule.forRoot()` in a `CacheModuleConfig` variable and include in both imports and exports. Without this, `CacheService` is not injectable outside core.
- Also re-export `CacheModule` from `magnet-module-imports.ts` (line ~128) for the exports array.
- Cache is OPTIONAL — if no `CacheMagnetProvider` is supplied, `CacheModule.forRoot(null)` uses built-in `MemoryCacheAdapter`

**Definition of Done:**

- [ ] `CacheMagnetProvider` type exists in provider union
- [ ] `categorizeProviders` handles `type: 'cache'`
- [ ] `buildMagnetImports` creates `CacheModule.forRoot()` and returns `CacheModuleConfig`
- [ ] Inline require() type cast in `magnet.module.ts` includes cache field
- [ ] `CacheModuleConfig` added to MagnetModule exports array
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 3: Built-in MemoryCacheAdapter in Core

**Objective:** Implement an in-memory cache adapter with TTL support and LRU eviction, built into the core package as the zero-config default.

**Dependencies:** Task 1

**Files:**

- Create: `packages/core/src/modules/cache/adapters/memory-cache.adapter.ts`
- Create: `packages/core/src/modules/cache/adapters/__tests__/memory-cache.adapter.test.ts`

**Key Decisions / Notes:**

- Use a `Map<string, { value: unknown; expiresAt: number }>` for storage
- LRU: track access order, evict least-recently-used when exceeding `maxEntries`
- TTL: check `expiresAt` on `get()`, lazy cleanup
- Periodic cleanup interval (configurable, default 60s) to prevent memory leaks from expired-but-unaccessed entries
- `deleteByPattern`: iterate keys, match against glob-to-regex conversion
- `dispose()`: clear map and stop cleanup interval
- Default `maxEntries: 1000`, default TTL: 300s (5 min)

**Definition of Done:**

- [ ] MemoryCacheAdapter implements all CacheAdapter methods
- [ ] TTL expiration works (get returns null after TTL)
- [ ] LRU eviction works when maxEntries exceeded
- [ ] Pattern-based deletion works
- [ ] All unit tests pass
- [ ] No `any` types

**Verify:**

- `cd /home/gjsoa/code/magnet && bun test packages/core/src/modules/cache/adapters/__tests__/memory-cache.adapter.test.ts`

---

### Task 4: CacheModule, CacheService, and CacheSettings

**Objective:** Create the core cache module with service layer, settings integration, and NestJS DI registration.

**Dependencies:** Task 2, Task 3

**Files:**

- Create: `packages/core/src/modules/cache/cache.module.ts`
- Create: `packages/core/src/modules/cache/cache.service.ts`
- Create: `packages/core/src/modules/cache/cache.constants.ts`
- Create: `packages/core/src/modules/cache/cache.settings.ts`
- Create: `packages/core/src/modules/cache/index.ts`
- Create: `packages/core/src/modules/cache/__tests__/cache.service.test.ts`
- Modify: `packages/core/src/modules.ts` (add cache export)

**Key Decisions / Notes:**

- `CacheModule.forRoot(adapter?: CacheAdapter | null)` — if null, instantiate `MemoryCacheAdapter` with settings defaults
- `CACHE_ADAPTER_TOKEN` constant for DI injection
- `CacheService` wraps the adapter, adds logging, reads settings for defaults
- `CacheSettings` class with `@Settings({ group: 'cache', label: 'Cache', icon: 'zap' })` (verify icon value is valid against existing settings like `email.settings.ts` which uses `'mail'`):
  - `defaultTtl: number` (default 300 seconds)
  - `maxMemoryEntries: number` (default 1000, only applies to memory adapter)
  - `enabled: boolean` (default true, master toggle)
- `CacheModule` is `global: true` so all modules can inject `CacheService`
- Export `CacheModule` and `CacheService` from `packages/core/src/modules/cache/index.ts`
- Add to `packages/core/src/modules.ts` exports

**Definition of Done:**

- [ ] CacheModule.forRoot() works with adapter or null
- [ ] CacheService delegates to adapter with settings-based defaults
- [ ] CacheSettings registers in Settings system
- [ ] Module is global
- [ ] Unit tests for CacheService pass
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun test packages/core/src/modules/cache/__tests__/cache.service.test.ts`
- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 5: Caching Decorators and CacheInterceptor

**Objective:** Implement `@Cacheable()`, `@CacheEvict()`, `@CachePut()`, `@CacheTTL()` decorators and the `CacheInterceptor` that reads their metadata.

**Dependencies:** Task 4

**Files:**

- Create: `packages/core/src/modules/cache/decorators/cacheable.decorator.ts`
- Create: `packages/core/src/modules/cache/decorators/cache-evict.decorator.ts`
- Create: `packages/core/src/modules/cache/decorators/cache-put.decorator.ts`
- Create: `packages/core/src/modules/cache/decorators/cache-ttl.decorator.ts`
- Create: `packages/core/src/modules/cache/decorators/index.ts`
- Create: `packages/core/src/modules/cache/interceptors/cache.interceptor.ts`
- Create: `packages/core/src/modules/cache/__tests__/cache.interceptor.test.ts`
- Create: `packages/core/src/modules/cache/__tests__/cache.decorators.test.ts`
- Modify: `packages/core/src/modules/cache/cache.module.ts` (register interceptor)
- Modify: `packages/core/src/index.ts` (export decorators — no DB deps, safe for early load)

**Key Decisions / Notes:**

- **@Cacheable(options?):** `SetMetadata(CACHE_METADATA_KEY, { operation: 'cacheable', key?, ttl? })`. Options: `key` (string pattern with `:arg0`, `:arg1` placeholders or function), `ttl` (seconds). Default key: `ClassName:methodName:JSON.stringify(args)`
- **@CacheEvict(options?):** `SetMetadata(CACHE_METADATA_KEY, { operation: 'evict', key?, allEntries? })`. `allEntries: true` clears pattern `ClassName:methodName:*`
- **@CachePut(options?):** `SetMetadata(CACHE_METADATA_KEY, { operation: 'put', key?, ttl? })`. Always executes, always caches result.
- **@CacheTTL(seconds):** `SetMetadata(CACHE_TTL_KEY, seconds)`. Can compose with @Cacheable.
- **CacheInterceptor:** Reads metadata, delegates to CacheService. For `cacheable`: check cache first → return if hit → execute method → cache result → return. For `evict`: execute method → delete cache entries. For `put`: execute method → cache result → return.
- Register `CacheInterceptor` as a provider in `CacheModule` (NOT as APP_INTERCEPTOR — users opt-in via `@UseInterceptors(CacheInterceptor)` on controllers/methods)
- **⚠️ Scope limitation:** `@UseInterceptors(CacheInterceptor)` works on NestJS controllers and route handlers ONLY. It does NOT intercept plain service method calls. The decorators (`@Cacheable`, etc.) are designed for controller endpoint methods. Document this in decorator JSDoc. If service-level caching is needed, users should call `CacheService` directly.
- Export decorators from core's `index.ts` (they only use `SetMetadata`, no DB deps)

**Definition of Done:**

- [ ] All four decorators set correct metadata
- [ ] CacheInterceptor handles cacheable, evict, put operations
- [ ] Cache key generation works with patterns and defaults
- [ ] @CacheTTL overrides default TTL
- [ ] Unit tests for interceptor cover hit, miss, evict, put scenarios
- [ ] Decorator tests verify metadata is set correctly
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun test packages/core/src/modules/cache/__tests__/cache.interceptor.test.ts`
- `cd /home/gjsoa/code/magnet && bun test packages/core/src/modules/cache/__tests__/cache.decorators.test.ts`
- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 6: @magnet-cms/adapter-cache-redis Package

**Objective:** Create the Redis cache adapter package that works with both Redis and Dragonfly via ioredis.

**Dependencies:** Task 1

**Files:**

- Create: `packages/adapters/cache-redis/package.json`
- Create: `packages/adapters/cache-redis/tsconfig.json`
- Create: `packages/adapters/cache-redis/tsup.config.ts`
- Create: `packages/adapters/cache-redis/biome.json`
- Create: `packages/adapters/cache-redis/src/index.ts`
- Create: `packages/adapters/cache-redis/src/redis-cache.adapter.ts`
- Create: `packages/adapters/cache-redis/src/__tests__/redis-cache.adapter.test.ts`

**Key Decisions / Notes:**

- Follow `packages/adapters/email-resend/` structure exactly
- `RedisCacheAdapter extends CacheAdapter` with `readonly name = 'redis'`
- Uses `ioredis` as peer dependency
- `static forRoot(config?)` returns `CacheMagnetProvider`
- Config: `{ url?: string; host?: string; port?: number; password?: string; db?: number; keyPrefix?: string }`. Auto-resolves from `REDIS_URL` or `CACHE_REDIS_URL` env vars.
- `get/set/delete` map directly to Redis `GET/SETEX/DEL`
- `deleteByPattern` uses Redis `SCAN` + `DEL` (not `KEYS` — safe for production)
- `has` uses Redis `EXISTS`
- `clear` uses `SCAN` + `DEL` with key prefix (not `FLUSHDB`)
- `healthCheck` uses `PING`
- `dispose` calls `redis.quit()`
- Serialization: `JSON.stringify` for set, `JSON.parse` for get
- `envVars`: `CACHE_REDIS_URL` (required: false, falls back to `REDIS_URL`)
- Package name: `@magnet-cms/adapter-cache-redis`

**Definition of Done:**

- [ ] RedisCacheAdapter implements all CacheAdapter methods
- [ ] forRoot() returns valid CacheMagnetProvider
- [ ] SCAN-based pattern deletion (not KEYS)
- [ ] Unit tests mock ioredis and cover all methods
- [ ] `bun run check-types` passes
- [ ] Package builds with tsup

**Verify:**

- `cd /home/gjsoa/code/magnet && bun test packages/adapters/cache-redis/src/__tests__/redis-cache.adapter.test.ts`
- `cd /home/gjsoa/code/magnet/packages/adapters/cache-redis && bun run build`

---

### Task 7: Integration Wiring and Smoke Tests

**Objective:** Verify the full integration works end-to-end: provider registration, module loading, cache operations through decorators.

**Dependencies:** Task 2, Task 4, Task 5, Task 6

**Files:**

- Create: `packages/core/src/modules/cache/__tests__/cache.integration.test.ts`
- Modify: `packages/core/src/modules/cache/index.ts` (ensure all exports)

**Key Decisions / Notes:**

- Integration test creates a NestJS testing module with `CacheModule.forRoot(null)` (memory adapter)
- Verifies: CacheService injectable, get/set/delete work, decorator metadata set
- Verifies: CacheModule.forRoot(mockRedisAdapter) accepts external adapter
- Run full `bun run check-types` and `bun run build` to confirm no cross-package issues
- Ensure `packages/core/src/modules/cache/index.ts` exports: `CacheModule`, `CacheService`, decorators, `CacheInterceptor`, `CACHE_ADAPTER_TOKEN`

**Definition of Done:**

- [ ] Integration test passes with memory adapter
- [ ] Integration test passes with mock external adapter
- [ ] Full type check passes (`bun run check-types`)
- [ ] Core package builds (`bun run build --filter=@magnet-cms/core`)
- [ ] Redis adapter package builds

**Verify:**

- `cd /home/gjsoa/code/magnet && bun test packages/core/src/modules/cache/__tests__/cache.integration.test.ts`
- `cd /home/gjsoa/code/magnet && bun run check-types`
- `cd /home/gjsoa/code/magnet && bun run build --filter=@magnet-cms/core`

## Open Questions

None — all decisions resolved.

## Deferred Ideas

- Cache admin UI page (stats, manual flush, key browser)
- Distributed cache invalidation via Redis pub/sub
- `@CacheWarm()` decorator for pre-loading caches on startup
- Memcached adapter
- Cache metrics/monitoring integration with Sentry plugin
