# Vault Plugin Implementation Plan

Created: 2026-03-14
Status: VERIFIED
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Create a `@magnet-cms/plugin-vault` plugin that integrates HashiCorp Vault for secrets management, supporting both remote Vault servers and local development with env fallback.

**Architecture:** The plugin has two integration points: (1) a `VaultBootstrap.resolve()` async helper for boot-time secrets (DB URI, JWT secret) called before `MagnetModule.forRoot()`, and (2) a runtime `VaultService` injectable for dynamic secret resolution with caching and rotation support. The admin UI provides a full settings page for connection config, secret path browsing, and connectivity testing.

**Tech Stack:** `node-vault-client` (Namecheap) for Vault communication, NestJS plugin module, React frontend with existing admin UI patterns.

## Scope

### In Scope
- Vault client wrapper with token and AppRole authentication
- Boot-time secret resolution via `VaultBootstrap.resolve()` with env fallback
- Runtime `VaultService` with caching and secret rotation watching
- Convention-based path mapping (`secret/data/magnet/{module}`) with explicit overrides
- Admin settings page: connection config, test connectivity, secret browser, mapping management
- `VaultSettings` schema for admin panel configuration
- REST API endpoints for Vault admin operations
- E2E API tests
- MDX documentation

### Out of Scope
- `MagnetModule.forRootAsync()` (future enhancement)
- Transit secrets engine (encryption-as-a-service)
- Dynamic database credentials (Vault database secrets engine)
- Kubernetes auth method (can be added via the extensible auth config)
- Docker compose for local Vault dev server (documented but not automated)

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Plugin pattern:** See `packages/plugins/content-builder/src/plugin.ts:16-44` — use `@Plugin()` decorator from `@magnet-cms/core` with `name`, `description`, `version`, `module` (NestJS module), and `frontend` (routes, sidebar). Plugin classes implement optional `PluginLifecycle` interface (`onPluginInit`, `onPluginDestroy`).

- **Plugin package structure:** Backend in `src/backend/`, frontend in `src/frontend/`. Backend built with tsup (`src/index.ts` + `src/backend/index.ts` entry points). Frontend built with Vite as IIFE bundle (`dist/frontend/bundle.iife.js`). See `packages/plugins/content-builder/package.json` for exports map pattern.

- **Settings pattern:** See `packages/core/src/modules/auth/auth.settings.ts` — use `@Settings()` and `@SettingField.*()` decorators from `@magnet-cms/common`. Settings auto-register on boot via `SettingsModule`. Groups appear as tabs in admin settings UI.

- **NestJS module in plugin:** See `packages/plugins/content-builder/src/backend/content-builder.module.ts` — standard `@Module()` with controllers/providers/exports. Referenced by `@Plugin({ module: VaultModule })`.

- **Frontend plugin registration:** See `packages/plugins/content-builder/src/frontend/index.ts` — self-registers on `window.__MAGNET_PLUGINS__` with manifest (routes, sidebar) and lazy-loaded components. Host app loads bundle at runtime.

- **Admin UI components:** Use `@magnet-cms/ui/components` for Shadcn-based components (Button, Input, Card, etc.) and `@magnet-cms/admin` for hooks (useAdapter for API calls). See `packages/client/admin/src/features/settings/` for settings page patterns.

- **Adapter factory pattern:** See `packages/core/src/modules/email/email-adapter.factory.ts` — dynamic `require()` for adapter packages. The Vault plugin doesn't need a factory since it IS the adapter, but follow similar error handling patterns.

- **Config types:** `MagnetModuleOptions` in `packages/common/src/types/config.types.ts` — the bootstrap helper works outside this; the plugin options are passed via `PluginConfig.options`.

- **Conventions:**
  - Biome for linting/formatting (`bun run lint`)
  - TypeScript strict mode, no `any`
  - Conventional commits
  - JSDoc on all exported functions/classes

- **Gotchas:**
  - `node-vault-client` uses CommonJS `require()` style — the tsup config handles ESM/CJS dual output
  - Plugin frontend must externalize all `@magnet-cms/*`, `react`, `react-router-dom`, `lucide-react`
  - The `VaultBootstrap` runs BEFORE NestJS — it cannot use DI, only plain TypeScript
  - Settings fields are limited to: Text, Number, Boolean, Select, JSON types

## Runtime Environment

- **Dev command:** `bun run dev` (runs all packages)
- **Build:** `bun run build`
- **Type check:** `bun run check-types`
- **E2E tests:** `bun run test:e2e --project=api`

## Assumptions

- `node-vault-client` supports Bun runtime without issues — supported by it being a pure JS HTTP client with no native bindings — Tasks 2, 3, 4 depend on this
- Vault KV v2 secrets engine is the target — supported by it being the default and most common engine — Tasks 2, 3 depend on this
- Plugin settings can store Vault connection config without a chicken-and-egg problem — supported by VaultBootstrap reading from env/config at boot, while VaultSettings provides runtime admin config — Tasks 4, 5 depend on this
- The admin UI can make authenticated API calls to plugin endpoints — supported by existing plugin controller pattern in content-builder — Tasks 5, 7 depend on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `node-vault-client` incompatible with Bun | Low | High | Fallback to raw `fetch`-based client; Vault HTTP API is simple |
| Vault connection fails silently at boot | Medium | High | `VaultBootstrap.resolve()` throws with clear error message; `fallbackToEnv: true` provides graceful degradation |
| Secret rotation causes mid-request inconsistency | Low | Medium | VaultService uses atomic cache swap — old values served until new fetch completes |
| Admin stores Vault token in settings DB | Medium | Medium | VaultSettings stores connection URL and auth method only; actual tokens come from env vars, not persisted in DB |

## Goal Verification

### Truths
1. A user can configure Vault connection via admin settings UI and test connectivity
2. `VaultBootstrap.resolve()` fetches secrets from Vault before NestJS boots
3. When Vault is not configured, `VaultBootstrap.resolve()` falls back to environment variables
4. `VaultService.get()` resolves secrets at runtime with caching
5. Convention-based paths (`secret/data/magnet/{module}`) work with zero explicit mapping
6. Explicit path overrides work alongside convention-based defaults
7. The plugin appears in the admin sidebar and provides a settings page

### Artifacts
1. `packages/plugins/vault/src/backend/vault.controller.ts` — admin API endpoints
2. `packages/plugins/vault/src/backend/vault-bootstrap.ts` — boot-time resolution
3. `packages/plugins/vault/src/backend/vault.service.ts` — runtime resolution
4. `packages/plugins/vault/src/frontend/pages/VaultSettings/index.tsx` — admin settings page
5. `apps/e2e/tests/api/vault.spec.ts` — E2E tests

## Progress Tracking

- [x] Task 1: Package scaffold, types, and plugin shell
- [x] Task 2: Vault client wrapper
- [x] Task 3: VaultBootstrap boot-time resolution
- [x] Task 4: VaultModule and VaultService
- [x] Task 5: VaultSettings and VaultController
- [x] Task 6: Plugin registration and lifecycle wiring
- [x] Task 7: Frontend settings page
- [x] Task 8: E2E tests
- [x] Task 9: Documentation

**Total Tasks:** 9 | **Completed:** 9 | **Remaining:** 0

## Implementation Tasks

### Task 1: Package Scaffold, Types, and Plugin Shell

**Objective:** Create the `@magnet-cms/plugin-vault` package with build config, TypeScript types, and empty plugin class.

**Dependencies:** None

**Files:**
- Create: `packages/plugins/vault/package.json`
- Create: `packages/plugins/vault/tsconfig.json`
- Create: `packages/plugins/vault/tsup.config.ts`
- Create: `packages/plugins/vault/vite.config.ts`
- Create: `packages/plugins/vault/src/index.ts`
- Create: `packages/plugins/vault/src/backend/index.ts`
- Create: `packages/plugins/vault/src/backend/types.ts`
- Create: `packages/plugins/vault/src/plugin.ts`

**Key Decisions / Notes:**
- Follow `packages/plugins/content-builder/package.json` exports map pattern
- Types include: `VaultConfig`, `VaultAuthConfig` (token | appRole), `VaultSecretMapping`, `VaultBootstrapOptions`, `VaultResolvedSecrets`
- `VaultAuthConfig` is a discriminated union on `type` field: `{ type: 'token'; token: string }` | `{ type: 'appRole'; roleId: string; secretId?: string }`
- `VaultSecretMapping`: `{ path: string; mapTo: string; watch?: boolean }`
- Convention prefix defaults to `secret/data/magnet/`
- Package has `node-vault-client` as a regular dependency (bundled by tsup) — avoids requiring consuming apps to install it separately
- `magnet` field in package.json: `{ "type": "plugin", "backend": true, "frontend": true }`
- Add `@magnet-cms/plugin-vault` as devDependency to `apps/examples/mongoose` so E2E tests can exercise plugin endpoints

**Definition of Done:**
- [ ] `bun install` succeeds with new package
- [ ] `bun run check-types` passes
- [ ] Package exports compile correctly via tsup

**Verify:**
- `cd packages/plugins/vault && bun run build`
- `bun run check-types`

---

### Task 2: Vault Client Wrapper

**Objective:** Create a typed wrapper around `node-vault-client` that handles authentication, KV v2 operations, and provides an env-fallback mode.

**Dependencies:** Task 1

**Files:**
- Create: `packages/plugins/vault/src/backend/vault.client.ts`

**Key Decisions / Notes:**
- `VaultClient` class wraps `node-vault-client`'s `VaultClient.boot()` with typed config
- Methods: `read(path: string)`, `write(path: string, data: Record<string, unknown>)`, `list(path: string)`, `healthCheck()`, `isConfigured()`
- `EnvFallbackClient` implements same interface but reads from `process.env` — used when `VAULT_ADDR` not set
- Factory function `createVaultClient(config?: VaultConfig)` returns either real client or env fallback
- All methods return typed results, never `any`
- Health check calls `GET /v1/sys/health` directly

**Definition of Done:**
- [ ] VaultClient wraps node-vault-client with typed interface
- [ ] EnvFallbackClient reads secrets from environment variables
- [ ] Factory returns correct client based on configuration
- [ ] `bun run check-types` passes

**Verify:**
- `bun run check-types`

---

### Task 3: VaultBootstrap Boot-Time Resolution

**Objective:** Create the `VaultBootstrap.resolve()` static async method that fetches secrets from Vault (or env) before NestJS initializes.

**Dependencies:** Task 2

**Files:**
- Create: `packages/plugins/vault/src/backend/vault-bootstrap.ts`

**Key Decisions / Notes:**
- `VaultBootstrap.resolve(options: VaultBootstrapOptions): Promise<VaultResolvedSecrets>` — static async method
- Options include: `url?` (auto-detect from `VAULT_ADDR`), `auth?` (auto-detect from `VAULT_TOKEN`), `paths` (record of module name → path config), `fallbackToEnv?` (default: true), `conventionPrefix?` (default: `secret/data/magnet/`)
- Each path config: `{ vaultPath?: string; envPrefix?: string }` — if `vaultPath` omitted, uses convention (`{prefix}{moduleName}`)
- Returns `Record<string, Record<string, unknown>>` keyed by module name
- When `fallbackToEnv: true` and no Vault configured: reads `{envPrefix}{KEY}` from `process.env` (e.g., `DB_URI`, `JWT_SECRET`)
- Throws clear error if Vault is configured but unreachable (not silent failure)
- Logs whether using Vault or env fallback mode

**Definition of Done:**
- [ ] `VaultBootstrap.resolve()` fetches secrets from Vault when configured
- [ ] Falls back to `process.env` when Vault not configured and `fallbackToEnv: true`
- [ ] Convention-based paths work without explicit `vaultPath`
- [ ] Throws descriptive error when Vault configured but unreachable
- [ ] `bun run check-types` passes

**Verify:**
- `bun run check-types`

---

### Task 4: VaultModule and VaultService

**Objective:** Create the NestJS module and injectable service for runtime secret resolution with caching and rotation support.

**Dependencies:** Task 2

**Files:**
- Create: `packages/plugins/vault/src/backend/vault.module.ts`
- Create: `packages/plugins/vault/src/backend/vault.service.ts`

**Key Decisions / Notes:**
- `VaultModule` is a standard NestJS `@Module` (not dynamic — config comes from plugin options)
- `VaultService` injectable with methods: `get<T>(path: string): Promise<T>`, `getMany(paths: string[]): Promise<Record<string, unknown>[]>`, `refresh(path: string): Promise<void>`
- In-memory cache with configurable TTL (default: 5 minutes)
- Cache uses `Map<string, { data: unknown; expiresAt: number }>` pattern
- `watch(path: string, interval: number)` starts periodic refresh for rotatable secrets — uses `setInterval` with cleanup in `onModuleDestroy`
- When no Vault configured: all methods return `undefined` with warning log (graceful no-op, same pattern as EmailService)
- Service reads config from `@Inject('VAULT_PLUGIN_OPTIONS')`

**Definition of Done:**
- [ ] VaultService resolves secrets at runtime with caching
- [ ] Cache respects TTL and returns fresh data after expiry
- [ ] `watch()` periodically refreshes secrets
- [ ] Graceful no-op when Vault not configured
- [ ] `bun run check-types` passes

**Verify:**
- `bun run check-types`

---

### Task 5: VaultSettings and VaultController

**Objective:** Create admin settings schema and REST API endpoints for Vault configuration and management.

**Dependencies:** Task 4

**Files:**
- Create: `packages/plugins/vault/src/backend/vault.settings.ts`
- Create: `packages/plugins/vault/src/backend/vault.controller.ts`

**Key Decisions / Notes:**
- `VaultSettings` with `@Settings()` decorator — group: `vault`, label: `Vault`, icon: `key-round`
- Sections: `connection` (URL, auth method selection), `paths` (convention prefix, mount path), `cache` (TTL, enable/disable)
- Fields: `enabled` (boolean), `url` (text), `authMethod` (select: token/appRole), `mountPath` (text, default: `secret`), `conventionPrefix` (text, default: `magnet`), `cacheTtl` (number, default: 300), `secretMappings` (JSON, stores `VaultSecretMapping[]` for explicit path overrides managed via admin UI)
- **Do NOT store tokens/secrets in settings** — tokens always from env vars. Settings UI renders informational labels (not inputs) for token config, showing which env var to set (e.g., "Set VAULT_TOKEN environment variable").
- `VaultController` at prefix `vault/` with endpoints:
  - `GET /vault/status` — connection status and health
  - `POST /vault/test-connection` — test Vault connectivity with provided config
  - `GET /vault/secrets` — list secret paths at configured mount (requires admin role)
  - `GET /vault/secrets/:path` — read secret keys (NOT values) at path
  - `GET /vault/mappings` — list configured secret mappings
  - `PUT /vault/mappings` — update secret mappings array
- All endpoints require authentication (existing auth guard from `@magnet-cms/core`)
- Controller pattern follows `packages/core/src/modules/email/email.controller.ts`

**Definition of Done:**
- [ ] VaultSettings appears in admin settings panel
- [ ] All controller endpoints return correct responses
- [ ] Tokens are never stored in database — audit VaultSettings class: no field of type Text/JSON captures VAULT_TOKEN or VAULT_SECRET_ID values
- [ ] Settings UI connection panel renders informational labels (not inputs) for token configuration
- [ ] Secret mappings CRUD works via API endpoints
- [ ] `bun run check-types` passes

**Verify:**
- `bun run check-types`
- Audit: `grep -n 'token\|secret_id\|password' packages/plugins/vault/src/backend/vault.settings.ts` should return zero SettingField matches

---

### Task 6: Plugin Registration and Lifecycle Wiring

**Objective:** Wire the `@Plugin` decorator with frontend manifest, lifecycle hooks, and module integration.

**Dependencies:** Task 4, Task 5

**Files:**
- Modify: `packages/plugins/vault/src/plugin.ts`
- Modify: `packages/plugins/vault/src/index.ts`
- Modify: `packages/plugins/vault/src/backend/index.ts`

**Key Decisions / Notes:**
- `@Plugin({ name: 'vault', description: 'Secrets management via HashiCorp Vault', version: '1.0.0', module: VaultModule })` with frontend manifest
- Frontend routes: single settings route at `vault/settings`
- Sidebar: `{ id: 'vault', title: 'Vault', url: '/vault/settings', icon: 'KeyRound', order: 90 }`
- Implement `PluginLifecycle`: `onPluginInit` logs Vault connection status, `onPluginDestroy` stops all watchers
- Export `VaultPlugin`, `VaultBootstrap`, `VaultService`, and all types from package index

**Definition of Done:**
- [ ] Plugin registers correctly via `PluginModule.forRoot()`
- [ ] Plugin appears in admin sidebar
- [ ] Lifecycle hooks execute on init/destroy
- [ ] All public API exported from package index
- [ ] `bun run check-types` passes

**Verify:**
- `bun run check-types`
- `bun run build`

---

### Task 7: Frontend Settings Page

**Objective:** Build the admin UI for Vault configuration, connection testing, and secret browsing.

**Dependencies:** Task 6

**Files:**
- Create: `packages/plugins/vault/src/frontend/index.ts`
- Create: `packages/plugins/vault/src/frontend/pages/VaultSettings/index.tsx`
- Create: `packages/plugins/vault/src/frontend/pages/VaultSettings/ConnectionPanel.tsx`
- Create: `packages/plugins/vault/src/frontend/pages/VaultSettings/SecretBrowser.tsx`
- Create: `packages/plugins/vault/src/frontend/pages/VaultSettings/MappingsPanel.tsx`

**Key Decisions / Notes:**
- Follow content-builder frontend pattern: self-register on `window.__MAGNET_PLUGINS__`
- `ConnectionPanel`: shows Vault URL (from settings), auth method, connection status indicator (green/red), "Test Connection" button
- `SecretBrowser`: tree view of secret paths at the configured mount. Shows path names and key names (NOT secret values). Expandable tree nodes.
- `MappingsPanel`: table of configured `VaultSecretMapping[]` entries with add/edit/delete. Each row: Vault path, mapTo target, watch toggle. Calls `PUT /vault/mappings` on save.
- Use `@magnet-cms/ui/components` for Card, Button, Input, Badge, Table, etc.
- Use `@magnet-cms/admin` hooks: `useAdapter()` for API calls
- Status indicators: connected (green badge), disconnected (red badge), not configured (gray badge)
- "Test Connection" calls `POST /vault/test-connection` and shows result toast

**Definition of Done:**
- [ ] Settings page renders with connection panel, secret browser, and mapping management
- [ ] Test connection button works and shows status
- [ ] Secret browser lists paths from Vault
- [ ] Mapping management supports add/edit/delete of explicit path overrides
- [ ] Frontend bundle builds successfully
- [ ] `bun run check-types` passes

**Verify:**
- `cd packages/plugins/vault && bun run build`

---

### Task 8: E2E Tests

**Objective:** Write E2E API tests for Vault plugin endpoints.

**Dependencies:** Task 6

**Files:**
- Create: `apps/e2e/tests/api/vault.spec.ts`

**Key Decisions / Notes:**
- Test without a real Vault server — endpoints should return appropriate responses when Vault is not configured
- The E2E example app (mongoose-example) MUST have VaultPlugin registered in its AppModule so endpoints are reachable (not 404)
- First test verifies `GET /vault/status` returns 200 (endpoint reachable) before any other assertions
- Test `GET /vault/status` returns disconnected/not-configured status
- Test `POST /vault/test-connection` with invalid URL returns error
- Test `GET /vault/secrets` requires authentication
- Test that unauthenticated requests are rejected
- Test mapping CRUD via `GET/PUT /vault/mappings`
- Follow pattern from `apps/e2e/tests/api/email.spec.ts`
- Tests use the API client helper from `apps/e2e/src/helpers/api-client.ts`

**Files:**
- Create: `apps/e2e/tests/api/vault.spec.ts`
- Modify: `apps/examples/mongoose/src/app.module.ts` (add VaultPlugin to plugins array)
- Modify: `apps/examples/mongoose/package.json` (add `@magnet-cms/plugin-vault` devDependency)

**Definition of Done:**
- [ ] VaultPlugin is registered in the mongoose example app
- [ ] `GET /vault/status` returns 200 (plugin endpoints are reachable)
- [ ] All E2E tests pass
- [ ] Tests verify auth requirements on protected endpoints
- [ ] Tests verify graceful behavior when Vault not configured
- [ ] No flaky tests

**Verify:**
- `bun run test:e2e --project=api -- --grep vault`

---

### Task 9: Documentation

**Objective:** Write MDX documentation for the Vault plugin setup and usage.

**Dependencies:** Task 6

**Files:**
- Create: `apps/docs/content/docs/plugins/vault.mdx`
- Modify: `apps/docs/content/docs/plugins/meta.json` (add vault entry)

**Key Decisions / Notes:**
- Frontmatter: `title: "Vault Plugin"`, `description: "Integrate HashiCorp Vault for secrets management"`
- Sections: Overview, Installation, Quick Start (bootstrap helper example), Configuration (auth methods, path mapping), Admin UI, Runtime Usage (VaultService), Local Development (env fallback), Production Setup
- Include TypeScript code examples for all configuration patterns
- Document environment variables: `VAULT_ADDR`, `VAULT_TOKEN`, `VAULT_ROLE_ID`, `VAULT_SECRET_ID`
- Document convention-based path mapping and explicit overrides

**Definition of Done:**
- [ ] MDX renders correctly in docs site
- [ ] All configuration patterns documented with examples
- [ ] `meta.json` updated with vault entry
- [ ] `bun run check-types` passes (docs build)

**Verify:**
- `bun run build` (includes docs)

## Open Questions

_None — all major decisions resolved._

## Deferred Ideas

- **MagnetModule.forRootAsync()** — async factory pattern for cleaner Vault integration at module level
- **Transit secrets engine** — use Vault for encryption/decryption as a service
- **Dynamic database credentials** — Vault generates short-lived DB credentials per request
- **Kubernetes auth** — authenticate using K8s service account tokens
- **Docker Compose integration** — auto-start local Vault dev server
- **Secret versioning UI** — browse and compare secret versions in admin panel
