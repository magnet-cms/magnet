# MagnetModule Configuration API Refactor

Created: 2026-03-17
Status: PENDING
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Replace the verbose `MagnetModule.forRoot({ db, jwt, storage, vault, email, plugins })` flat config object with a clean provider-based API: `MagnetModule.forRoot([...providers], globalOptions?)` where each adapter/plugin has a static `.forRoot()` method, declares its env vars, and auto-resolves them from `process.env`. Remove adapter-specific switches from core modules.

**Architecture:** Each adapter and plugin implements a static `.forRoot()` that returns a discriminated-union `MagnetProvider` object containing type, adapter instance, resolved config, and env var requirements. `MagnetModule.forRoot()` collects all providers, validates env vars upfront (fail-fast before NestJS bootstrap), applies defaults for missing provider types, and wires up core modules generically.

**Tech Stack:** NestJS DynamicModule, TypeScript discriminated unions, process.env resolution, Reflect metadata

## Scope

### In Scope

- New `MagnetProvider` discriminated union type and `EnvVarRequirement` interface
- New `MagnetGlobalOptions` type (replaces parts of `MagnetModuleOptions`)
- Static `.forRoot()` on all 11 adapter packages and 3 plugin packages
- Env var auto-resolution: each adapter reads from `process.env` when config value not explicitly provided
- Startup validation: collect all required env vars, validate before NestJS bootstraps, print clear error and exit if missing
- Rewritten `MagnetModule.forRoot(providers, globalOptions?)` in core
- Remove `StorageAdapterFactory`, `VaultAdapterFactory`, `EmailAdapterFactory`, `DatabaseAdapterFactory` from core
- Remove `detectDatabaseAdapter()` calls from user code — adapter's `forRoot()` sets it automatically
- Update `DatabaseAdapter.connect()` signature from `(options: MagnetModuleOptions)` to `(config: DBConfig)`
- Default providers: LocalStorage (storage), ConsoleEmail (email), DbVault (vault), JWT (auth)
- Update all 5 example apps, create-magnet CLI, docs, E2E tests

### Out of Scope

- `MagnetModule.forRootAsync()` (deferred to follow-up spec)
- New capability interfaces beyond what `DatabaseAdapter` already has (deferred)
- AI plugin adapter changes (not yet merged to main)
- Backward-compatible shim for old API

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - NestJS DynamicModule pattern: `packages/core/src/modules/storage/storage.module.ts:15-46` — static method returns `{ module, imports, providers, exports }`
  - Plugin decorator pattern: `packages/core/src/modules/plugin/decorators/plugin.decorator.ts:34-61` — `@Plugin()` stores metadata via Reflect
  - Adapter singleton pattern: `packages/adapters/db-mongoose/src/mongoose.adapter.ts:151` — `export const Adapter = new MongooseAdapter()`
  - All 5 example apps: `apps/examples/mongoose`, `apps/examples/drizzle-neon`, `apps/examples/drizzle-supabase`, `apps/examples/drizzle-mysql`, `apps/examples/drizzle-sqlite`

- **Conventions:**
  - No `any` or `as any` — use `unknown` + type guards
  - Biome for lint/format: `bun run lint`
  - Type check: `bun run check-types`
  - All exported functions need explicit types and JSDoc

- **Key files:**
  - `packages/common/src/types/config.types.ts` — Current `MagnetModuleOptions` class (being replaced)
  - `packages/core/src/magnet.module.ts` — Current `MagnetModule.forRoot()` (being rewritten)
  - `packages/core/src/utils/init-options.util.ts` — Current default resolution (being removed)
  - `packages/common/src/utils/detect-adapter.util.ts` — Current adapter detection (being updated)

- **Gotchas:**
  - `@Schema()` decorator runs at import time (before `@Module` decorator evaluates). Database adapter MUST be set before schemas are imported. Solution: adapter package index.ts calls `setDatabaseAdapter()` as side effect on import.
  - `DbVaultAdapter` requires NestJS `ModuleRef` — can't be instantiated in static `.forRoot()`. Use factory pattern in `VaultMagnetProvider`.
  - `AuthModule` needs `jwt.secret` from global options AND auth strategy from provider — these come from different sources.
  - `PluginModule` reads `@Plugin()` metadata via Reflect — the plugin class must be decorated, not just have `.forRoot()`.

- **Domain context:**
  - Adapters are interchangeable implementations: database (mongoose/drizzle), storage (local/s3/r2/supabase), email (nodemailer/resend), vault (db/hashicorp/supabase), auth (jwt/supabase/clerk)
  - Plugins are feature extensions: content-builder, stripe, polar. They use `@Plugin()` decorator and register NestJS modules.
  - Core modules (StorageModule, VaultModule, EmailModule, etc.) consume adapter instances via injection tokens.

## Runtime Environment

- **Start command:** `bun run dev` (runs all packages in dev mode)
- **Build:** `bun run build` (Turborepo builds all packages)
- **Type check:** `bun run check-types` (must pass before commit)
- **E2E:** `bun run test:e2e`

## Feature Inventory

### Files Being Replaced

| File | Functions/Classes | Task | Notes |
|------|------------------|------|-------|
| `packages/common/src/types/config.types.ts` | `MagnetModuleOptions` class, `MagnetModuleOptionsAsync` type | Task 1 | Replace with `MagnetGlobalOptions`, keep class for DI token but change shape |
| `packages/core/src/utils/init-options.util.ts` | `initOptions()` | Task 9 | Remove entirely — replaced by env var auto-resolution in adapters |
| `packages/core/src/modules/database/database-adapter.factory.ts` | `DatabaseAdapterFactory` | Task 10 | Remove — adapters self-register via `forRoot()` |
| `packages/core/src/modules/storage/storage-adapter.factory.ts` | `StorageAdapterFactory` | Task 10 | Remove — adapters self-register via `forRoot()` |
| `packages/core/src/modules/email/email-adapter.factory.ts` | `EmailAdapterFactory` | Task 10 | Remove — adapters self-register via `forRoot()` |
| `packages/core/src/modules/vault/vault-adapter.factory.ts` | `VaultAdapterFactory` | Task 10 | Remove — adapters self-register via `forRoot()` |
| `packages/core/src/modules/auth/auth-strategy.factory.ts` | `AuthStrategyFactory` | Task 10 | Simplify — keep for JWT built-in, remove custom strategy map |

### Files Being Modified

| File | Changes | Task |
|------|---------|------|
| `packages/common/src/types/database.types.ts` | Update `DatabaseAdapter.connect()` signature | Task 1 |
| `packages/common/src/utils/detect-adapter.util.ts` | Keep but mark as internal, adapter forRoot sets it | Task 11 |
| `packages/common/src/decorators/schema/schema.decorator.ts` | No change needed (uses existing detectDatabaseAdapter) | N/A |
| `packages/core/src/magnet.module.ts` | Complete rewrite of `forRoot()` | Task 9 |
| `packages/core/src/modules/database/database.module.ts` | Simplify `register()` to accept adapter+config directly | Task 10 |
| `packages/core/src/modules/storage/storage.module.ts` | Simplify to accept adapter instance directly | Task 10 |
| `packages/core/src/modules/email/email.module.ts` | Simplify to accept adapter instance directly | Task 10 |
| `packages/core/src/modules/vault/vault.module.ts` | Simplify to accept adapter/factory directly | Task 10 |
| `packages/core/src/modules/auth/auth.module.ts` | Accept auth config from provider + global JWT | Task 10 |
| `packages/core/src/modules/plugin/plugin.module.ts` | Accept `PluginMagnetProvider[]` instead of `PluginConfig[]` | Task 10 |
| `packages/adapters/db-mongoose/src/mongoose.adapter.ts` | Add static `forRoot()`, update `connect()` signature | Task 3 |
| `packages/adapters/db-mongoose/src/index.ts` | Add side-effect `setDatabaseAdapter('mongoose')` | Task 3 |
| `packages/adapters/db-drizzle/src/drizzle.adapter.ts` | Add static `forRoot()`, update `connect()` signature | Task 3 |
| `packages/adapters/db-drizzle/src/index.ts` | Add side-effect `setDatabaseAdapter('drizzle')` | Task 3 |
| `packages/adapters/storage-s3/src/*.ts` | Add static `forRoot()` to S3StorageAdapter | Task 4 |
| `packages/adapters/storage-r2/src/*.ts` | Add static `forRoot()` to R2StorageAdapter | Task 4 |
| `packages/adapters/storage-supabase/src/*.ts` | Add static `forRoot()` to SupabaseStorageAdapter | Task 4 |
| `packages/adapters/auth-supabase/src/*.ts` | Add static `forRoot()` to SupabaseAuthStrategy | Task 5 |
| `packages/adapters/auth-clerk/src/*.ts` | Add static `forRoot()` to ClerkAuthStrategy | Task 5 |
| `packages/adapters/email-nodemailer/src/*.ts` | Add static `forRoot()` | Task 6 |
| `packages/adapters/email-resend/src/*.ts` | Add static `forRoot()` | Task 6 |
| `packages/adapters/vault-hashicorp/src/*.ts` | Add static `forRoot()` | Task 7 |
| `packages/adapters/vault-supabase/src/*.ts` | Add static `forRoot()` | Task 7 |
| `packages/plugins/stripe/src/plugin.ts` | Add static `forRoot()` | Task 8 |
| `packages/plugins/content-builder/src/plugin.ts` | Add static `forRoot()` | Task 8 |
| `packages/plugins/polar/src/plugin.ts` | Add static `forRoot()` | Task 8 |
| All 5 `apps/examples/*/src/app.module.ts` | New API usage | Task 12 |
| `packages/create-magnet/src/generators/app-module.ts` | New API code generation | Task 13 |

## Assumptions

- Only one database adapter is registered at a time — supported by current architecture (singleton cache) — Tasks 3, 9, 11 depend on this
- Adapter packages are imported at the top of the file, before schema files — supported by standard TypeScript import ordering — Task 11 depends on this
- `MagnetModuleOptions` can be repurposed as the DI token class while changing its shape — supported by NestJS `useValue` provider pattern — Tasks 1, 9 depend on this
- The DbVaultAdapter built-in default requires no env vars when VAULT_MASTER_KEY is optional — needs verification, supported by `packages/core/src/modules/vault/adapters/db-vault.adapter.ts` which generates a key if not set — Tasks 7, 9 depend on this
- Plugin `.forRoot()` is purely syntactic sugar — plugins still use `@Plugin()` decorator for metadata, `forRoot()` just returns a typed provider with options — Tasks 8, 10 depend on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Schema decoration order breaks when adapter sets itself on import | Medium | High | Database adapter index.ts calls `setDatabaseAdapter()` as module-level side effect; test with both adapters in example apps |
| DbVaultAdapter factory pattern introduces async complexity | Low | Medium | Use NestJS `useFactory` with `ModuleRef` injection — same pattern as current vault module |
| Breaking change disrupts downstream users | High | Medium | Update all examples, CLI generator, and docs in same PR; add migration guide to docs |
| Large number of files modified increases merge conflict risk | Medium | Medium | Sequential tasks with frequent type-check runs; complete in single branch |
| Env var validation exits process during testing | Low | Medium | Validation utility accepts options: `{ exitOnFailure: boolean }` — tests can disable exit |
| Tree-shaking drops setDatabaseAdapter() side-effect import | Low | High | Mark adapter `package.json` with `"sideEffects": true`; verify tsup config preserves the call |

## Goal Verification

### Truths

1. `MagnetModule.forRoot([...providers], globalOptions?)` accepts an array of `MagnetProvider` objects and optional global settings
2. Each adapter/plugin provides a static `.forRoot()` that returns a `MagnetProvider` with type, env vars, and resolved config
3. Missing required env vars cause process exit with a clear error listing ALL missing vars before NestJS bootstraps
4. No `setDatabaseAdapter('drizzle')` call in user code — adapter auto-registers on import
5. No adapter-specific switch/if in `StorageAdapterFactory`, `VaultAdapterFactory`, `EmailAdapterFactory`, or `DatabaseAdapterFactory` — these files are deleted
6. All 5 example apps use the new API and pass type checking
7. `create-magnet` CLI generates code using the new API

### Artifacts

1. `packages/common/src/types/config.types.ts` — `MagnetProvider`, `MagnetGlobalOptions`, `EnvVarRequirement`
2. `packages/core/src/utils/validate-env.util.ts` — Env var validation utility
3. `packages/core/src/magnet.module.ts` — Rewritten `forRoot()`
4. `packages/adapters/db-mongoose/src/mongoose.adapter.ts` — `MongooseAdapter.forRoot()` / `packages/adapters/db-drizzle/src/drizzle.adapter.ts` — `DrizzleAdapter.forRoot()`
5. `apps/examples/mongoose/src/app.module.ts` (and 4 others) — New API usage

## Progress Tracking

- [x] Task 1: Foundation types in @magnet-cms/common
- [x] Task 2: Env var validation utility
- [x] Task 3: Database adapters forRoot (mongoose + drizzle)
- [x] Task 4: Storage adapters forRoot (s3, r2, supabase)
- [x] Task 5: Auth adapters forRoot (supabase, clerk)
- [x] Task 6: Email adapters forRoot (nodemailer, resend)
- [x] Task 7: Vault adapters forRoot (hashicorp, supabase)
- [x] Task 8: Plugin forRoot (stripe, content-builder, polar)
- [x] Task 9: Rewrite MagnetModule.forRoot()
- [x] Task 10: Remove factories + update core modules
- [x] Task 11: Update @Schema auto-detection
- [x] Task 12: Update example apps
- [x] Task 13: Update create-magnet CLI
- [ ] Task 14: Update documentation
- [ ] Task 15: E2E tests

**Total Tasks:** 15 | **Completed:** 13 | **Remaining:** 2

## Implementation Tasks

### Task 1: Foundation Types in @magnet-cms/common

**Objective:** Define the `MagnetProvider` discriminated union, `EnvVarRequirement` interface, and `MagnetGlobalOptions` type that all adapters and plugins will use.
**Dependencies:** None

**Files:**

- Modify: `packages/common/src/types/config.types.ts`
- Create: `packages/common/src/types/provider.types.ts`
- Modify: `packages/common/src/types/database.types.ts`
- Modify: `packages/common/src/types/index.ts` (re-export new types)

**Key Decisions / Notes:**

- `MagnetProvider` is a discriminated union on `type` field: `'database' | 'storage' | 'email' | 'vault' | 'auth' | 'plugin'`
- Each variant carries type-specific data (adapter instance, config, etc.)
- `EnvVarRequirement`: `{ name: string; required: boolean; description?: string }`
- `MagnetGlobalOptions` replaces `MagnetModuleOptions` for the second argument: `{ jwt?: { secret?: string; expiresIn?: string }; admin?: boolean | AdminConfig; rbac?: RBACModuleOptions; internationalization?: InternationalizationOptions; playground?: PlaygroundOptions }`
- Keep `MagnetModuleOptions` class name but change it to represent the merged resolved config that gets provided via DI (internal use). Add a `providers` field.
- Update `DatabaseAdapter.connect()` signature: change `options: MagnetModuleOptions` → `config: DBConfig`. Note: `DBConfig` is already a union type `MongooseConfig | DrizzleConfig` defined at `packages/common/src/types/database.types.ts:37`. `MongooseConfig` has `uri: string`. `DrizzleConfig` has `connectionString`, `dialect`, `driver`, `debug`, `migrations` — all fields are preserved in the union. No fields are lost.
- `VaultMagnetProvider` has optional `adapterFactory?: (moduleRef: ModuleRef) => VaultAdapter` for adapters that need NestJS DI (DbVaultAdapter)
- `PluginMagnetProvider` carries the `@Plugin()`-decorated class + options
- All types exported from `@magnet-cms/common`

**Provider type definitions:**

```typescript
interface BaseMagnetProvider {
  envVars: EnvVarRequirement[]
}

interface DatabaseMagnetProvider extends BaseMagnetProvider {
  type: 'database'
  adapter: DatabaseAdapter
  config: DBConfig
}

interface StorageMagnetProvider extends BaseMagnetProvider {
  type: 'storage'
  adapter: StorageAdapter
  config?: Record<string, unknown>
}

interface EmailMagnetProvider extends BaseMagnetProvider {
  type: 'email'
  adapter: EmailAdapter
  defaults?: { from?: string; replyTo?: string }
}

interface VaultMagnetProvider extends BaseMagnetProvider {
  type: 'vault'
  adapter?: VaultAdapter
  adapterFactory?: (moduleRef: unknown) => VaultAdapter
  config?: { cacheTtl?: number }
}

interface AuthMagnetProvider extends BaseMagnetProvider {
  type: 'auth'
  config: AuthConfig
}

interface PluginMagnetProvider extends BaseMagnetProvider {
  type: 'plugin'
  plugin: Type<unknown>
  options?: Record<string, unknown>
}

type MagnetProvider = DatabaseMagnetProvider | StorageMagnetProvider | EmailMagnetProvider | VaultMagnetProvider | AuthMagnetProvider | PluginMagnetProvider
```

**Definition of Done:**

- [ ] `MagnetProvider` discriminated union type defined and exported
- [ ] `EnvVarRequirement` interface defined and exported
- [ ] `MagnetGlobalOptions` type defined and exported
- [ ] `DatabaseAdapter.connect()` signature updated to `(config: DBConfig)`
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 2: Env Var Validation Utility

**Objective:** Create a utility that collects env var requirements from all registered providers, validates them against `process.env`, and prints clear errors before NestJS bootstraps.
**Dependencies:** Task 1

**Files:**

- Create: `packages/core/src/utils/validate-env.util.ts`
- Modify: `packages/core/src/utils/index.ts` (re-export)

**Key Decisions / Notes:**

- Function: `validateEnvironment(providers: MagnetProvider[], globalOptions?: MagnetGlobalOptions): void`
- Collect all `envVars` from providers + add JWT_SECRET if not explicitly provided in globalOptions
- For each required env var, check if `process.env[name]` is set AND not empty string
- If any missing: print a formatted table to console.error showing ALL missing vars (not just first), then call `process.exit(1)`
- Accept options parameter: `{ exitOnFailure?: boolean }` — when false, throw Error instead of exit (for testing)
- Group missing vars by provider type in output for clarity
- Format example:
  ```
  ❌ Magnet CMS: Missing required environment variables

  Database (DrizzleAdapter):
    - DATABASE_URL: Database connection string

  Payments (StripePlugin):
    - STRIPE_SECRET_KEY: Stripe API secret key
    - STRIPE_WEBHOOK_SECRET: Stripe webhook signing secret

  Set these in your .env file or environment before starting the application.
  ```

**Definition of Done:**

- [ ] `validateEnvironment()` function created
- [ ] Prints all missing vars grouped by provider type
- [ ] Exits process with code 1 when required vars missing
- [ ] Accepts `exitOnFailure: false` option for testing
- [ ] Does nothing when all required vars are present
- [ ] Unit test: `validateEnvironment()` with `exitOnFailure: false` throws when a required var is absent
- [ ] Unit test: `validateEnvironment()` does not throw when all vars present
- [ ] Unit test: error message includes all missing vars grouped by provider type
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 3: Database Adapters forRoot (Mongoose + Drizzle)

**Objective:** Add static `.forRoot()` methods to both database adapter packages that return `DatabaseMagnetProvider`, auto-resolve env vars, and register the adapter on import.
**Dependencies:** Task 1

**Files:**

- Modify: `packages/adapters/db-mongoose/src/mongoose.adapter.ts`
- Modify: `packages/adapters/db-mongoose/src/index.ts`
- Modify: `packages/adapters/db-drizzle/src/drizzle.adapter.ts`
- Modify: `packages/adapters/db-drizzle/src/index.ts`

**Key Decisions / Notes:**

- **Mongoose forRoot:**
  - `MongooseAdapter.forRoot(config?: { uri?: string })` → `DatabaseMagnetProvider`
  - envVars: `[{ name: 'MONGODB_URI', required: true, description: 'MongoDB connection URI' }]`
  - Auto-resolve: `uri = config?.uri ?? process.env.MONGODB_URI ?? ''`
  - The adapter class is currently private (`class MongooseAdapter`). Export it as a named class: `export class MongooseDatabaseAdapter`
  - Remove `export const Adapter` singleton — this is a breaking change, no backward compat shim. Grep for all imports of `Adapter` from `@magnet-cms/adapter-db-mongoose` and update them (primarily `database-adapter.factory.ts` which is deleted in Task 10, and any test files)

- **Drizzle forRoot:**
  - `DrizzleDatabaseAdapter.forRoot(config?: Partial<DrizzleConfig>)` → `DatabaseMagnetProvider`
  - envVars: `[{ name: 'DATABASE_URL', required: true, description: 'Database connection string' }]`
  - Auto-resolve: `connectionString = config?.connectionString ?? process.env.DATABASE_URL ?? ''`
  - dialect, driver, migrations config are optional and have no env var equivalents

- Both: `index.ts` adds `setDatabaseAdapter('mongoose'|'drizzle')` as module-level side effect
- Both: Update `connect()` signature to accept `DBConfig` instead of `MagnetModuleOptions` (per Task 1)
- `forRoot()` calls `setDatabaseAdapter()` AND sets it in index.ts side effect (belt and suspenders for schema decoration order)

**Definition of Done:**

- [ ] `MongooseDatabaseAdapter.forRoot()` returns valid `DatabaseMagnetProvider`
- [ ] `DrizzleDatabaseAdapter.forRoot()` returns valid `DatabaseMagnetProvider`
- [ ] Importing `@magnet-cms/adapter-db-mongoose` auto-calls `setDatabaseAdapter('mongoose')`
- [ ] Importing `@magnet-cms/adapter-db-drizzle` auto-calls `setDatabaseAdapter('drizzle')`
- [ ] `connect()` signature updated on both adapters
- [ ] Both adapter `package.json` files have `"sideEffects": true` (or `["./dist/**/*.js"]`) to prevent tree-shaking from dropping the `setDatabaseAdapter()` call
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 4: Storage Adapters forRoot (S3, R2, Supabase)

**Objective:** Add static `.forRoot()` to each external storage adapter package.
**Dependencies:** Task 1

**Files:**

- Modify: `packages/adapters/storage-s3/src/s3-storage.adapter.ts` (or main export file)
- Modify: `packages/adapters/storage-r2/src/r2-storage.adapter.ts`
- Modify: `packages/adapters/storage-supabase/src/supabase-storage.adapter.ts`

**Key Decisions / Notes:**

- **S3:**
  - `S3StorageAdapter.forRoot(config?: Partial<S3StorageConfig>)` → `StorageMagnetProvider`
  - envVars: `S3_BUCKET` (required), `S3_REGION`, `S3_ACCESS_KEY_ID` (required), `S3_SECRET_ACCESS_KEY` (required), `S3_ENDPOINT`
  - Auto-resolve each from env, override with explicit config

- **R2:**
  - `R2StorageAdapter.forRoot(config?: Partial<R2StorageConfig>)` → `StorageMagnetProvider`
  - envVars: `R2_BUCKET` (required), `R2_ACCOUNT_ID` (required), `R2_ACCESS_KEY_ID` (required), `R2_SECRET_ACCESS_KEY` (required), `R2_PUBLIC_URL`

- **Supabase Storage:**
  - `SupabaseStorageAdapter.forRoot(config?: Partial<SupabaseStorageConfig>)` → `StorageMagnetProvider`
  - envVars: `SUPABASE_URL` (required), `SUPABASE_SERVICE_KEY` (required), `SUPABASE_STORAGE_BUCKET`

- Note: LocalStorageAdapter is built into core and doesn't need forRoot — it's the default when no storage provider is registered

**Definition of Done:**

- [ ] All 3 storage adapter classes have static `forRoot()` returning `StorageMagnetProvider`
- [ ] Each declares `envVars` with correct required flags
- [ ] Config values override env var defaults
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 5: Auth Adapters forRoot (Supabase, Clerk)

**Objective:** Add static `.forRoot()` to auth adapter packages.
**Dependencies:** Task 1

**Files:**

- Modify: `packages/adapters/auth-supabase/src/supabase-auth.strategy.ts`
- Modify: `packages/adapters/auth-clerk/src/clerk-auth.strategy.ts`

**Key Decisions / Notes:**

- **Supabase Auth:**
  - `SupabaseAuthAdapter.forRoot(config?: Partial<SupabaseAuthConfig>)` → `AuthMagnetProvider`
  - envVars: `SUPABASE_URL` (required), `SUPABASE_ANON_KEY` (required), `SUPABASE_SERVICE_KEY`
  - Sets `strategy: 'supabase'` in the returned `AuthConfig`
  - No more need for `AuthStrategyFactory.registerStrategy('supabase', ...)` in user code — handled internally

- **Clerk Auth:**
  - `ClerkAuthAdapter.forRoot(config?: { publishableKey?: string; secretKey?: string })` → `AuthMagnetProvider`
  - envVars: `CLERK_PUBLISHABLE_KEY` (required), `CLERK_SECRET_KEY` (required)
  - Sets `strategy: 'clerk'` in the returned `AuthConfig`

- Both: `forRoot()` registers the strategy class via `AuthStrategyFactory.registerStrategy()` internally

**Definition of Done:**

- [ ] Both auth adapters have static `forRoot()` returning `AuthMagnetProvider`
- [ ] Strategy registration happens inside `forRoot()` (no user code needed)
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 6: Email Adapters forRoot (Nodemailer, Resend)

**Objective:** Add static `.forRoot()` to email adapter packages.
**Dependencies:** Task 1

**Files:**

- Modify: `packages/adapters/email-nodemailer/src/` (main adapter file)
- Modify: `packages/adapters/email-resend/src/` (main adapter file)

**Key Decisions / Notes:**

- **Nodemailer:**
  - `NodemailerEmailAdapter.forRoot(config?: Partial<NodemailerConfig & { defaults?: EmailDefaults }>)` → `EmailMagnetProvider`
  - envVars: `SMTP_HOST` (required), `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
  - Auto-resolve host, port, auth from env

- **Resend:**
  - `ResendEmailAdapter.forRoot(config?: { apiKey?: string; defaults?: EmailDefaults })` → `EmailMagnetProvider`
  - envVars: `RESEND_API_KEY` (required), `EMAIL_FROM`

- Note: ConsoleEmailAdapter is built into core — it's the default when no email provider is registered

**Definition of Done:**

- [ ] Both email adapters have static `forRoot()` returning `EmailMagnetProvider`
- [ ] Env vars declared with correct required flags
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 7: Vault Adapters forRoot (HashiCorp, Supabase)

**Objective:** Add static `.forRoot()` to vault adapter packages.
**Dependencies:** Task 1

**Files:**

- Modify: `packages/adapters/vault-hashicorp/src/hashicorp-vault.adapter.ts`
- Modify: `packages/adapters/vault-supabase/src/supabase-vault.adapter.ts`

**Key Decisions / Notes:**

- **HashiCorp Vault:**
  - `HashiCorpVaultAdapter.forRoot(config?: Partial<HashiCorpVaultConfig>)` → `VaultMagnetProvider`
  - envVars: `VAULT_ADDR` (required), `VAULT_TOKEN` (required)
  - Auto-resolve url from VAULT_ADDR, token from VAULT_TOKEN
  - Returns `adapter` directly (no factory needed — doesn't need ModuleRef)

- **Supabase Vault:**
  - `SupabaseVaultAdapter.forRoot(config?: Partial<SupabaseVaultConfig>)` → `VaultMagnetProvider`
  - envVars: `SUPABASE_URL` (required), `SUPABASE_SERVICE_KEY` (required)

- Note: DbVaultAdapter is built into core — it's the default when no vault provider is registered. It uses `adapterFactory` pattern because it needs ModuleRef.

**Definition of Done:**

- [ ] Both vault adapters have static `forRoot()` returning `VaultMagnetProvider`
- [ ] Env vars declared correctly
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 8: Plugin forRoot (Stripe, ContentBuilder, Polar)

**Objective:** Add static `.forRoot()` to plugin classes that returns `PluginMagnetProvider`.
**Dependencies:** Task 1

**Files:**

- Modify: `packages/plugins/stripe/src/plugin.ts`
- Modify: `packages/plugins/content-builder/src/plugin.ts`
- Modify: `packages/plugins/polar/src/plugin.ts`
- Modify: `packages/plugins/stripe/src/types.ts` (make secret fields optional)
- Modify: `packages/plugins/polar/src/types.ts` (make secret fields optional)

**Key Decisions / Notes:**

- **Stripe:**
  - `StripePlugin.forRoot(config?: Partial<StripePluginConfig>)` → `PluginMagnetProvider`
  - envVars: `STRIPE_SECRET_KEY` (required), `STRIPE_WEBHOOK_SECRET` (required), `STRIPE_PUBLISHABLE_KEY`
  - Auto-resolve secrets from env, merge with explicit config
  - `StripePluginConfig.secretKey`, `webhookSecret`, `publishableKey` become optional (auto-resolved)

- **ContentBuilder:**
  - `ContentBuilderPlugin.forRoot(config?: { modulesPath?: string })` → `PluginMagnetProvider`
  - envVars: `[]` (no env vars needed)

- **Polar:**
  - `PolarPlugin.forRoot(config?: Partial<PolarPluginConfig>)` → `PluginMagnetProvider`
  - envVars: `POLAR_ACCESS_TOKEN` (required), `POLAR_WEBHOOK_SECRET` (required), `POLAR_ORGANIZATION_ID`

- Each `forRoot()` returns `{ type: 'plugin', plugin: PluginClass, options: resolvedConfig, envVars: [...] }`
- The `@Plugin()` decorator stays — `forRoot()` is sugar that packages the class + options into a typed provider

**Definition of Done:**

- [ ] All 3 plugins have static `forRoot()` returning `PluginMagnetProvider`
- [ ] Secret fields are optional in config types (auto-resolved from env)
- [ ] Env vars declared correctly
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 9: Rewrite MagnetModule.forRoot()

**Objective:** Replace the current flat-config `MagnetModule.forRoot(options)` with the new provider-based `MagnetModule.forRoot(providers, globalOptions?)`.
**Dependencies:** Tasks 1, 2

**Files:**

- Modify: `packages/core/src/magnet.module.ts` (major rewrite)
- Delete: `packages/core/src/utils/init-options.util.ts`
- Modify: `packages/core/src/utils/index.ts` (remove initOptions export, add validateEnvironment)

**Key Decisions / Notes:**

- New signature: `static forRoot(providers: MagnetProvider[], globalOptions?: MagnetGlobalOptions): DynamicModule`
- Processing flow (**ordering is critical — auth adapter forRoot() must run before AuthModule.forRoot() so strategy is registered**):
  1. Categorize providers by type (find database, storage, email, vault, auth, plugins). **This step iterates the provider array which was already constructed by the user's forRoot() calls — side effects like `AuthStrategyFactory.registerStrategy()` have already fired.**
  2. Validate: at least one database provider required
  3. Apply defaults for missing types:
     - Storage: create default `LocalStorageAdapter` provider
     - Email: create default console-only provider
     - Vault: create default `DbVaultAdapter` factory provider
     - Auth: use JWT from `globalOptions.jwt` (required if no auth provider)
  4. Call `validateEnvironment(allProviders, globalOptions)` — fail fast
  5. Build module imports from each provider
  6. Provide `MagnetModuleOptions` via DI with merged config for backward compat of DI consumers

- `MagnetModuleOptions` is still injected via DI for services that need it (e.g., `AuthModule` uses `options.jwt.secret`). Build this from the resolved providers + globalOptions.

- The `forRoot()` still returns a `DynamicModule` with all core module imports.

- Remove `initOptions()` usage entirely.

**Definition of Done:**

- [ ] `MagnetModule.forRoot(providers, options?)` accepts new signature
- [ ] Missing provider types get sensible defaults
- [ ] Environment validation runs before module creation
- [ ] `MagnetModuleOptions` DI token still available for injecting services
- [ ] `initOptions.util.ts` deleted
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 10: Remove Factories + Update Core Modules

**Objective:** Delete adapter-specific factory classes from core and update core modules to consume adapter instances from providers generically.
**Dependencies:** Tasks 3-9

**Files:**

- Delete: `packages/core/src/modules/database/database-adapter.factory.ts`
- Delete: `packages/core/src/modules/storage/storage-adapter.factory.ts`
- Delete: `packages/core/src/modules/email/email-adapter.factory.ts`
- Delete: `packages/core/src/modules/vault/vault-adapter.factory.ts`
- Modify: `packages/core/src/modules/database/database.module.ts`
- Modify: `packages/core/src/modules/storage/storage.module.ts`
- Modify: `packages/core/src/modules/email/email.module.ts`
- Modify: `packages/core/src/modules/vault/vault.module.ts`
- Modify: `packages/core/src/modules/auth/auth.module.ts`
- Modify: `packages/core/src/modules/auth/auth-strategy.factory.ts`
- Modify: `packages/core/src/modules/plugin/plugin.module.ts`
- Modify: various `index.ts` files to remove factory re-exports

**Key Decisions / Notes:**

- **DatabaseModule.register():** Change from `register(options: MagnetModuleOptions)` to `register(adapter: DatabaseAdapter, config: DBConfig)`. The adapter is passed directly — no factory lookup.

- **StorageModule.forRoot():** Change from `forRoot(config?: StorageConfig)` to `forRoot(adapter: StorageAdapter, config?: Record<string, unknown>)`. No more `StorageAdapterFactory`. Adapter instance provided directly via `STORAGE_ADAPTER` token.

- **EmailModule.forRoot():** Change from `forRoot(config?: EmailConfig)` to `forRoot(adapter: EmailAdapter | null, defaults?: { from?: string; replyTo?: string })`. Always wraps in `ConsoleEmailAdapter` for logging.

- **VaultModule.forRoot():** Change from `forRoot(config?: VaultConfig)` to `forRoot(adapter?: VaultAdapter, adapterFactory?: (moduleRef: ModuleRef) => VaultAdapter, config?: { cacheTtl?: number })`. Supports both direct adapter and factory.

- **AuthModule.forRoot():** Receives `authConfig` from provider (if any) + jwt config from global options. No change to internal strategy handling.

- **PluginModule.forRoot():** Change from `forRoot(options: PluginModuleOptions)` to accept `PluginMagnetProvider[]`. Same internal logic but typed providers.

- **AuthStrategyFactory:** Simplify — keep `getStrategy()` for JWT built-in, keep custom strategy registration (used by auth adapter forRoot() internally). Remove package detection.

**Definition of Done:**

- [ ] All 4 factory files deleted
- [ ] Core modules accept adapter instances directly (no factory calls)
- [ ] No adapter-specific switch/case/if statements in core module code
- [ ] `AuthStrategyFactory` simplified (no package map)
- [ ] Verify `PluginModule` reads `@Plugin()` metadata from `provider.plugin` class reference — `Reflect.getMetadata(PLUGIN_METADATA, provider.plugin)` returns correct name, module, frontend config
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 11: Update @Schema Auto-Detection

**Objective:** Ensure `@Schema()` decorator works without explicit `setDatabaseAdapter()` in user code.
**Dependencies:** Task 3

**Files:**

- Modify: `packages/common/src/utils/detect-adapter.util.ts` (add documentation, keep logic)

**Key Decisions / Notes:**

- The `@Schema()` decorator already calls `detectDatabaseAdapter()` which falls back to package detection
- Task 3 adds `setDatabaseAdapter()` as a side effect in each adapter's `index.ts`
- This means: importing the adapter package → sets the adapter → `@Schema()` finds it
- `detect-adapter.util.ts` stays as-is functionally but update JSDoc to document the new flow
- `setDatabaseAdapter()` stays exported for edge cases but is no longer needed in typical user code
- Verify that example apps work without explicit `setDatabaseAdapter('drizzle')` calls

**Definition of Done:**

- [ ] `detectDatabaseAdapter()` documentation updated to reflect new auto-registration flow
- [ ] Verify that adapter import side-effect sets adapter correctly
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 12: Update Example Apps

**Objective:** Rewrite all 5 example `app.module.ts` files to use the new `MagnetModule.forRoot([...providers], options)` API.
**Dependencies:** Tasks 9, 10, 11

**Files:**

- Modify: `apps/examples/mongoose/src/app.module.ts`
- Modify: `apps/examples/drizzle-neon/src/app.module.ts`
- Modify: `apps/examples/drizzle-supabase/src/app.module.ts`
- Modify: `apps/examples/drizzle-mysql/src/app.module.ts`
- Modify: `apps/examples/drizzle-sqlite/src/app.module.ts`

**Key Decisions / Notes:**

- **Mongoose example** (before → after):
  ```typescript
  // BEFORE:
  import { setDatabaseAdapter } from '@magnet-cms/common'
  // (not used for mongoose, but drizzle examples have it)
  MagnetModule.forRoot({
    db: { uri: process.env.MONGODB_URI || '...' },
    jwt: { secret: process.env.JWT_SECRET || '...' },
    admin: true,
    storage: { adapter: 'local', local: { ... } },
    plugins: [{ plugin: ContentBuilderPlugin }, { plugin: StripePlugin, options: {...} }],
  })

  // AFTER:
  import { MongooseDatabaseAdapter } from '@magnet-cms/adapter-db-mongoose'
  import { NodemailerEmailAdapter } from '@magnet-cms/email-nodemailer'
  import { HashiCorpVaultAdapter } from '@magnet-cms/adapter-vault-hashicorp'
  MagnetModule.forRoot([
    MongooseDatabaseAdapter.forRoot(),
    HashiCorpVaultAdapter.forRoot(),
    NodemailerEmailAdapter.forRoot({ secure: false, auth: { user: '', pass: '' } }),
    ContentBuilderPlugin.forRoot(),
    StripePlugin.forRoot({ currency: 'usd', features: { ... } }),
  ], { admin: true })
  ```

- **Drizzle-supabase example:** Remove `setDatabaseAdapter('drizzle')` and `AuthStrategyFactory.registerStrategy(...)` calls. Use `DrizzleDatabaseAdapter.forRoot()`, `SupabaseAuthAdapter.forRoot()`, `SupabaseStorageAdapter.forRoot()`, `SupabaseVaultAdapter.forRoot()`.

- **Drizzle-neon/mysql/sqlite examples:** Remove `setDatabaseAdapter('drizzle')`. Use `DrizzleDatabaseAdapter.forRoot({ dialect: '...', driver: '...' })`.

- Remove `ConfigModule.forRoot({ isGlobal: true })` ONLY if no longer needed. (Keep if other NestJS features use it.)

**Definition of Done:**

- [ ] All 5 example apps use new API
- [ ] No `setDatabaseAdapter()` calls in user code
- [ ] No `AuthStrategyFactory.registerStrategy()` calls in user code
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 13: Update create-magnet CLI

**Objective:** Update the CLI code generator to produce the new `MagnetModule.forRoot([...providers])` syntax.
**Dependencies:** Task 12

**Files:**

- Modify: `packages/create-magnet/src/generators/app-module.ts`
- Modify: `packages/create-magnet/src/generators/package-json.ts` (if import names changed)

**Key Decisions / Notes:**

- Replace `generateMagnetConfig()` function to produce provider array syntax
- Remove `setDatabaseAdapter('drizzle')` generation for Drizzle projects
- Remove `AuthStrategyFactory.registerStrategy(...)` generation for Supabase projects
- Import adapter classes instead of just `MagnetModule`
- Follow patterns established in Task 12 example apps

**Definition of Done:**

- [ ] Generated `app.module.ts` uses new API for all database/storage/auth combinations
- [ ] No `setDatabaseAdapter()` in generated code
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 14: Update Documentation

**Objective:** Update MDX documentation to reflect the new configuration API.
**Dependencies:** Task 12

**Files:**

- Modify: `apps/docs/content/docs/getting-started/quick-start.mdx`
- Modify: `apps/docs/content/docs/core/index.mdx`
- Modify: `apps/docs/content/docs/core/database-module.mdx`
- Modify: `apps/docs/content/docs/core/auth-module.mdx`
- Modify: `apps/docs/content/docs/adapters/index.mdx`
- Modify: `apps/docs/content/docs/adapters/mongoose.mdx`
- Modify: `apps/docs/content/docs/adapters/drizzle.mdx`
- Modify: `apps/docs/content/docs/adapters/supabase.mdx`
- Modify: `apps/docs/content/docs/plugins/index.mdx`
- Modify: `apps/docs/content/docs/plugins/content-builder.mdx`
- Modify: `README.md`

**Key Decisions / Notes:**

- Update all code examples showing `MagnetModule.forRoot()` usage
- Document the new provider pattern with `.forRoot()` on adapters
- Document env var auto-resolution behavior
- Document startup validation behavior
- Add migration guide section explaining old → new API

**Definition of Done:**

- [ ] All docs code examples use new API
- [ ] Env var auto-resolution documented
- [ ] Startup validation documented
- [ ] `bun run check-types` passes (docs build)

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 15: E2E Tests

**Objective:** Update E2E test configuration and ensure tests pass with new API.
**Dependencies:** Tasks 12, 14

**Files:**

- Modify: `apps/e2e/` test files that reference MagnetModule configuration
- Possibly modify: `apps/backend/` if it exists and uses old API

**Key Decisions / Notes:**

- E2E tests run against example apps — if example apps are updated (Task 12), E2E should work
- Check if any E2E test fixtures create MagnetModule instances directly
- Run full E2E suite: `bun run test:e2e`
- Smoke test: start mongoose example with `MONGODB_URI` unset, verify process exits non-zero with formatted env var error output

**Definition of Done:**

- [ ] `bun run check-types` passes
- [ ] `bun run test:e2e --project=api` passes
- [ ] `bun run test:e2e --project=ui` passes (if applicable)
- [ ] No adapter-specific factory imports in test code

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types && bun run test:e2e`

---

## Open Questions

None — all design decisions resolved.

### Deferred Ideas

- `MagnetModule.forRootAsync()` — async provider factory pattern for runtime config resolution (e.g., from ConfigService)
- Capability interfaces beyond `AdapterCapabilities` — formal `WithMigrations`, `WithSoftDelete` interfaces on all adapter types
- Plugin dependency resolution — automatic ordering based on `dependencies` field in `@Plugin()` metadata
