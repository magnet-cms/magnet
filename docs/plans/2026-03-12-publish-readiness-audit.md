# Publish Readiness Audit — Phase A: Core Fixes & E2E Infrastructure

Created: 2026-03-12
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Fix critical issues in core modules that would block publishing, and redesign the E2E test infrastructure for reliable, comprehensive testing.

**Architecture:** This is Phase A of a multi-phase publish readiness effort. It focuses on: (1) fixing core module issues that prevent features from working correctly, (2) redesigning the E2E test foundation so subsequent phases can add test coverage efficiently.

**Tech Stack:** NestJS, Playwright, Bun, Mongoose

## Scope

### In Scope
- Fix `SettingsService` async factory timing issue (blocks settings initialization)
- Fix Playwright config project naming (`chromium` → `ui` to match documented `--project=ui`)
- Fix missing core module exports from `packages/core/src/index.ts`
- Fix `any` type violations across core modules (history, discovery, content, storage)
- Redesign E2E test fixtures for proper test isolation and cleanup
- Add missing API E2E tests for: content, users, settings, discovery, environment, history
- Fix admin-serve test to work with the `api` project or its own project

### Out of Scope (Phase B+)
- UI E2E test redesign (existing UI tests need similar rework but are lower priority)
- Plugin system E2E tests
- Documentation site E2E tests
- Admin UI feature completeness audit
- Performance testing
- CI/CD pipeline configuration
- Drizzle/Supabase adapter testing

## Context for Implementer

> Write for an implementer who has never seen the codebase.

**Patterns to follow:**
- Controllers: `packages/core/src/modules/auth/auth.controller.ts` — NestJS controller with guards, JSDoc
- E2E API tests: `apps/e2e/tests/api/rbac.spec.ts` — best existing example (15 tests, proper structure)
- E2E fixtures: `apps/e2e/src/fixtures/auth.fixture.ts` — extends base fixture with auth
- Settings schema: `packages/core/src/modules/auth/auth.settings.ts` — `@Settings()` decorator usage

**Conventions:**
- All controllers use `@RestrictedRoute()` decorator (admin-only endpoints)
- Auth-protected endpoints use `@UseGuards(JwtAuthGuard)`
- RBAC-protected endpoints add `@UseGuards(JwtAuthGuard, PermissionGuard)`
- E2E tests import from local fixtures, not directly from `@playwright/test`
- API client methods in `apps/e2e/src/helpers/api-client.ts`

**Key files:**
- `packages/core/src/magnet.module.ts` — root module registration (line 58-74: imports array)
- `packages/core/src/index.ts` — public API exports
- `packages/core/src/modules/settings/settings.service.ts:48-57` — the TODO/timing issue
- `apps/e2e/playwright.config.ts` — test project config
- `apps/e2e/src/fixtures/base.fixture.ts` — base test fixture
- `apps/e2e/src/helpers/api-client.ts` — API client for E2E tests

**Gotchas:**
- `UserModule` is NOT in MagnetModule.forRoot() — it's imported by AuthModule. This is intentional (UserModule.forFeature() allows custom user schemas), but it means UserController endpoints only work when AuthModule is loaded.
- The `cats` and `owners` endpoints come from the example app, not core. E2E tests that test these require the mongoose example app running.
- `@RestrictedRoute()` marks endpoints as admin-only (not accessible from public API). The `RestrictedGuard` checks this.
- Settings model isn't available during `onModuleInit` due to async DatabaseModule factory. The `waitForModel()` pattern exists but is commented out.

**Domain context:**
- Magnet is a headless CMS. "Content" = schema-based documents (like Strapi). Each user-defined schema (Cat, Owner, etc.) gets CRUD via ContentController.
- "Discovery" = runtime introspection of registered schemas, controllers, and methods for the admin UI.
- "Document" = the document lifecycle service that wraps content operations with versioning.

## Runtime Environment
- **Start command:** `bun run dev:admin` starts the **drizzle-supabase** example (not mongoose!) + Vite admin UI
- **For E2E tests (Tasks 6-11):** The mongoose example must be running since tests use Cat/Owner schemas. Start manually: `cd apps/examples/mongoose && bun run dev` (port 3000). Alternatively, update `scripts/dev-admin.js` to target mongoose.
- **Health check:** `GET http://localhost:3000/health`
- **E2E tests:** `cd apps/e2e && bun run test` (requires servers running)

## Assumptions
- The mongoose example app (`apps/examples/mongoose`) is the primary E2E test target — supported by `apps/e2e/src/helpers/api-client.ts` having Cat/Owner types — Tasks 6-11 depend on this
- SettingsService timing issue is solvable by deferring initialization to first-use or using `onApplicationBootstrap` — supported by existing `waitForModel()` code at settings.service.ts:49 — Task 1 depends on this
- Core module exports in `index.ts` can be safely expanded without breaking existing consumers — supported by the fact that most modules are already internally imported — Task 3 depends on this
- Content API tests can use the Cat/Owner schemas from the example app as test subjects — Tasks 6, 7 depend on this

## Testing Strategy
- **E2E (API):** Playwright API testing against running mongoose example app
- **Integration:** Settings initialization verified by calling settings endpoints after bootstrap
- **Type checking:** `bun run check-types` must pass with zero errors after `any` removal

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Settings timing fix breaks other modules | Medium | High | Test all settings-dependent features (auth settings, content settings, storage settings) after fix |
| Removing `any` from history service breaks query builder compatibility | Medium | Medium | Use adapter-specific query types from `@magnet-cms/common` or narrow with type guards |
| E2E tests flaky without proper cleanup | High | Medium | Implement per-test data isolation — each test creates and cleans up its own data |

## Pre-Mortem
*Assume this plan failed. Most likely internal reasons:*
1. **Settings timing fix is more complex than expected** (Task 1) → Trigger: `onApplicationBootstrap` still doesn't have the model ready because DatabaseModule.register() is truly async and resolves after all lifecycle hooks
2. **`any` removal in history service requires query builder interface changes** (Task 4) → Trigger: the `as any` casts exist because the query builder's `.where()` and `.sort()` don't accept the needed types

## Goal Verification

### Truths
1. `bun run check-types` passes with zero errors across all packages
2. Settings initialize automatically on application bootstrap (no warning log)
3. All 11 core controllers have corresponding API E2E tests
4. E2E tests create and clean up their own data (no cross-test pollution)
5. `bun run test:e2e --project=api` runs all API tests successfully
6. `bun run test:e2e --project=ui` runs all UI tests successfully

### Artifacts
- `packages/core/src/index.ts` — complete exports
- `packages/core/src/modules/settings/settings.service.ts` — fixed initialization
- `apps/e2e/playwright.config.ts` — corrected project names
- `apps/e2e/tests/api/*.spec.ts` — comprehensive API test suite
- `apps/e2e/src/fixtures/*.ts` — redesigned test fixtures

### Key Links
- MagnetModule → SettingsModule → SettingsService (initialization chain)
- AuthModule → UserModule → DatabaseModule (user dependency chain)
- E2E fixtures → ApiClient → NestJS controllers (test integration chain)

## Progress Tracking
- [x] Task 1: Fix SettingsService initialization timing
- [x] Task 2: Fix Playwright config project names
- [x] Task 3: Fix core module exports
- [x] Task 4: Fix `any` type violations in core
- [x] Task 5: Redesign E2E test fixtures and cleanup
- [x] Task 6: Add Content API E2E tests
- [x] Task 7: Add Users API E2E tests
- [x] Task 8: Add Settings API E2E tests
- [x] Task 9: Add Discovery API E2E tests
- [x] Task 10: Add Environment API E2E tests
- [x] Task 11: Add History API E2E tests

- [x] Task 12: Secure UserController with auth guards

**Total Tasks:** 12 | **Completed:** 12 | **Remaining:** 0

## Implementation Tasks

### Task 1: Fix SettingsService Initialization Timing

**Objective:** Fix the TODO at `settings.service.ts:49` so settings schemas are automatically registered and initialized on application bootstrap, instead of being deferred.

**Dependencies:** None

**Files:**
- Modify: `packages/core/src/modules/settings/settings.service.ts`
- Modify: `packages/core/src/modules/settings/settings.module.ts`

**Key Decisions / Notes:**
- Change from `OnModuleInit` to `OnApplicationBootstrap` lifecycle hook — by this point, all async module factories have resolved
- The existing `waitForModel()` and `discoverAndInitializeSchemas()` methods are already implemented but commented out — uncomment and adapt
- If `OnApplicationBootstrap` still doesn't work, implement lazy initialization on first `get()`/`set()` call with a `this.initialized` flag

**Definition of Done:**
- [ ] Settings initialize without the warning log message
- [ ] `AuthSettings` defaults are available via `GET /settings/authentication`
- [ ] No `TODO` comments remain in settings.service.ts
- [ ] `bun run check-types` passes

**Verify:**
- Start the mongoose example app and check logs for settings initialization
- `curl http://localhost:3000/settings/authentication` returns settings with defaults

---

### Task 2: Fix Playwright Config Project Names

**Objective:** Align Playwright project names with documented commands (`--project=ui`, `--project=api`).

**Dependencies:** None

**Files:**
- Modify: `apps/e2e/playwright.config.ts`

**Key Decisions / Notes:**
- The `api` and `docs` projects already exist and must be preserved as-is
- Rename `chromium` project to `ui` (single browser for now — multi-browser testing is a Phase B concern)
- Remove `firefox` and `webkit` projects (they duplicate `chromium` with no additional value in this phase)
- Add `admin-serve` project for the admin serving tests (currently no project matches `tests/admin-serve/`)

**Definition of Done:**
- [ ] `bun run test:e2e --project=api` runs API tests (already works — verify preserved)
- [ ] `bun run test:e2e --project=ui` runs UI tests (renamed from `chromium`)
- [ ] `bun run test:e2e --project=docs` runs docs tests (preserved)
- [ ] `bun run test:e2e --project=admin-serve` runs admin static serving tests (new)
- [ ] `firefox` and `webkit` projects removed

**Verify:**
- `cd apps/e2e && npx playwright test --list --project=ui` lists UI test files
- `cd apps/e2e && npx playwright test --list --project=api` lists API test files

---

### Task 3: Fix Core Module Exports

**Objective:** Export all core modules and their public APIs from `packages/core/src/index.ts` so consumers can import them.

**Dependencies:** None

**Files:**
- Modify: `packages/core/src/index.ts`

**Key Decisions / Notes:**
- Currently exports: magnet.module, api-keys, auth, events, rbac, storage, plugin, restricted.route
- Missing exports: content, database, discovery, document, environment, health, history, settings, user
- Add each missing module's index.ts barrel export
- Do NOT export admin or admin-serve (internal modules, not for consumer use)
- Verify no circular dependency issues by running `bun run build` after changes

**Definition of Done:**
- [ ] All public modules exported: content, database, discovery, document, environment, health, history, settings, user
- [ ] `bun run build` succeeds with no circular dependency errors
- [ ] `bun run check-types` passes

**Verify:**
- `bun run build` in packages/core
- Verify exports by checking the built dist output

---

### Task 4: Fix `any` Type Violations in Core

**Objective:** Remove all `any` type usage from core package source files, replacing with proper types.

**Dependencies:** Task 3 (exports may surface additional type issues)

**Files:**
- Modify: `packages/core/src/modules/history/history.service.ts` (8 instances)
- Modify: `packages/core/src/modules/history/history.controller.ts` (1 instance)
- Modify: `packages/core/src/modules/history/dto/create-version.dto.ts` (1 instance)
- Modify: `packages/core/src/modules/discovery/services/metadata-extractor.service.ts` (4 instances)
- Modify: `packages/core/src/modules/content/content.service.ts` (2 instances)
- Modify: `packages/core/src/modules/storage/storage.controller.ts` (2 instances)
- Modify: `packages/common/src/types/validations.types.ts` (1 instance)

**Key Decisions / Notes:**
- History service `as any` casts on `.where()` and `.sort()` — use `QueryFilter` and `SortOptions` types from the query builder interface in `@magnet-cms/common`
- History `data: any` → use `Record<string, unknown>` for version snapshot data
- MetadataExtractorService `InstanceWrapper<any>` → use `InstanceWrapper<object>` or the specific NestJS type
- Content service `as any` on supabase strategy → create a proper `SupabaseAuthStrategy` type or use type guard
- Storage controller `(req as any)?.user?.id` → create `AuthenticatedRequest` interface extending `Request`
- Validation types `constraints: any[]` → use `unknown[]` or specific constraint types

**Definition of Done:**
- [ ] Zero `any` types in core package (`grep -rn ": any\|as any\|<any>" packages/core/src/` returns nothing)
- [ ] Zero `any` types in common package
- [ ] `bun run check-types` passes
- [ ] `bun run build` succeeds

**Verify:**
- `grep -rn ": any\|as any\|<any>" packages/core/src/ packages/common/src/ --include="*.ts" | grep -v node_modules` returns empty
- `bun run check-types` (authoritative — catches all `any` usages tsc finds)

---

### Task 5: Redesign E2E Test Fixtures and Cleanup

**Objective:** Create a robust test fixture system with proper data isolation, authenticated client management, and cleanup hooks.

**Dependencies:** None (can run in parallel with Tasks 1-4)

**Files:**
- Modify: `apps/e2e/src/fixtures/base.fixture.ts`
- Modify: `apps/e2e/src/fixtures/auth.fixture.ts`
- Modify: `apps/e2e/src/helpers/api-client.ts` (add cleanup methods)
- Modify: `apps/e2e/src/helpers/test-data.ts`
- Create: `apps/e2e/src/fixtures/cleanup.fixture.ts`

**Key Decisions / Notes:**
- Current issues: auth fixture silently catches registration errors, no test data cleanup, `testData.user.create()` may produce duplicates
- Add `CleanupManager` to track created resources and delete them in reverse order after each test
- Make test data generation use unique identifiers (timestamp + random suffix) to prevent collisions
- Auth fixture should fail loudly if neither register nor login works (no silent catch)
- Add `docsBaseURL` to base fixture (currently missing)
- Add `authenticatedApiClient` to base auth fixture that handles setup-or-login properly

**Definition of Done:**
- [ ] Tests create unique data per run (no collisions with parallel runs)
- [ ] Tests clean up created data after completion
- [ ] Auth fixture fails with clear error message if auth setup fails
- [ ] Base fixture provides `apiBaseURL`, `uiBaseURL`, `docsBaseURL`

**Verify:**
- Run API tests twice in sequence — second run doesn't fail due to leftover data
- Run a failing test — cleanup still executes

---

### Task 6: Add Content API E2E Tests

**Objective:** Test the Content CRUD API (`/content/:schema`) including create, read, update, delete, publish/unpublish, and locale management.

**Dependencies:** Task 5 (fixtures)

**Files:**
- Create: `apps/e2e/tests/api/content.spec.ts`
- Modify: `apps/e2e/src/helpers/api-client.ts` (add missing content methods if needed)

**Key Decisions / Notes:**
- Use the Cat schema from the example app as the test schema (schema name is likely "Cat" or "cats")
- Test endpoints: list, get by documentId, create, create empty, update, delete, publish, unpublish, add locale, delete locale, get locale statuses, get versions, restore version
- Content API requires JWT auth + permission guards — use `authenticatedApiClient` from auth fixture
- The `createContent` method already exists in ApiClient

**Definition of Done:**
- [ ] Tests for all Content controller endpoints (list, get, create, update, delete)
- [ ] Tests for publish/unpublish workflow
- [ ] Tests for locale management (add, delete, get statuses)
- [ ] Tests for version history (get versions, restore)
- [ ] Error cases: 404 for nonexistent documents, 400 for invalid data
- [ ] All tests pass with `bun run test:e2e --project=api`

**Verify:**
- `cd apps/e2e && npx playwright test tests/api/content.spec.ts`

---

### Task 7: Add Users API E2E Tests

**Objective:** Test the Users CRUD API (`/users`) including create, list, get, update, delete, and password reset.

**Dependencies:** Task 5 (fixtures)

**Files:**
- Create: `apps/e2e/tests/api/users.spec.ts`
- Modify: `apps/e2e/src/helpers/api-client.ts` (add user management methods)

**Key Decisions / Notes:**
- User endpoints: `POST /users`, `GET /users`, `GET /users/:id`, `PUT /users/:id`, `DELETE /users/:id`, `POST /users/:id/reset-password`
- UserController has NO auth guards — this may be intentional (setup flow) or a gap. Test documents current behavior.
- Add `createUser`, `getUsers`, `getUser`, `updateUser`, `deleteUser`, `resetUserPassword` to ApiClient

**Definition of Done:**
- [ ] Tests for all User controller endpoints
- [ ] Tests for pagination (page, limit query params)
- [ ] Tests for password reset flow
- [ ] Error cases: 404 for nonexistent users
- [ ] All tests pass

**Verify:**
- `cd apps/e2e && npx playwright test tests/api/users.spec.ts`

---

### Task 8: Add Settings API E2E Tests

**Objective:** Test the Settings API (`/settings/:group`) for get and update operations.

**Dependencies:** Task 1 (settings initialization), Task 5 (fixtures)

**Files:**
- Create: `apps/e2e/tests/api/settings.spec.ts`

**Key Decisions / Notes:**
- Settings endpoints: `GET /settings/:group`, `PUT /settings/:group`
- Settings are `@RestrictedRoute()` — only accessible from admin context
- Test with `authentication` group (AuthSettings) which should exist after Task 1 fix
- ApiClient already has `getSettings` and `updateSettings` methods

**Definition of Done:**
- [ ] Tests for getting settings by group
- [ ] Tests for updating settings
- [ ] Tests that updated settings persist
- [ ] Error cases: 404 for nonexistent groups
- [ ] All tests pass

**Verify:**
- `cd apps/e2e && npx playwright test tests/api/settings.spec.ts`

---

### Task 9: Add Discovery API E2E Tests

**Objective:** Test the Discovery API (`/discovery`) which provides schema and endpoint introspection for the admin UI.

**Dependencies:** Task 5 (fixtures)

**Files:**
- Create: `apps/e2e/tests/api/discovery.spec.ts`
- Modify: `apps/e2e/src/helpers/api-client.ts` (add discovery methods)

**Key Decisions / Notes:**
- Discovery endpoints: `GET /discovery/schemas`, `GET /discovery/schemas/:name`, `GET /discovery/controllers`, `GET /discovery/controllers/:name/methods`
- Discovery is `@RestrictedRoute()` — admin-only
- ApiClient already has `getSchemas()` — add the remaining methods
- Should return Cat, Owner, Veterinarian, MedicalRecord schemas from the example app

**Definition of Done:**
- [ ] Tests for listing all schemas
- [ ] Tests for getting a specific schema's metadata
- [ ] Tests for listing controllers and methods
- [ ] Verify schema metadata includes field definitions and UI hints
- [ ] All tests pass

**Verify:**
- `cd apps/e2e && npx playwright test tests/api/discovery.spec.ts`

---

### Task 10: Add Environment API E2E Tests

**Objective:** Test the Environment API (`/environments`) for environment management.

**Dependencies:** Task 5 (fixtures)

**Files:**
- Create: `apps/e2e/tests/api/environment.spec.ts`
- Modify: `apps/e2e/src/helpers/api-client.ts` (add environment methods)

**Key Decisions / Notes:**
- Environment controller at `packages/core/src/modules/environment/environment.controller.ts`
- Read the controller to determine exact endpoints before implementing
- Environment is `@RestrictedRoute()` — admin-only

**Definition of Done:**
- [ ] Tests for all Environment controller endpoints
- [ ] Verify environment configuration is returned correctly
- [ ] All tests pass

**Verify:**
- `cd apps/e2e && npx playwright test tests/api/environment.spec.ts`

---

### Task 11: Add History API E2E Tests

**Objective:** Test the History API (`/history`) for version history tracking.

**Dependencies:** Task 4 (type fixes), Task 5 (fixtures)

**Files:**
- Create: `apps/e2e/tests/api/history.spec.ts`
- Modify: `apps/e2e/src/helpers/api-client.ts` (add history methods)

**Key Decisions / Notes:**
- History controller at `packages/core/src/modules/history/history.controller.ts`
- Read the controller to determine exact endpoints before implementing
- History is `@RestrictedRoute()` — admin-only
- History entries are created automatically when content is modified — test by creating/updating content then checking history

**Definition of Done:**
- [ ] Tests for listing history entries
- [ ] Tests for getting specific version details
- [ ] Tests that history is created when content changes
- [ ] All tests pass

**Verify:**
- `cd apps/e2e && npx playwright test tests/api/history.spec.ts`

---

### Task 12: Secure UserController with Auth Guards

**Objective:** Add authentication and authorization guards to UserController to prevent unauthenticated access to user management endpoints. This is a v1.0 publish blocker.

**Dependencies:** None

**Files:**
- Modify: `packages/core/src/modules/user/user.controller.ts`

**Key Decisions / Notes:**
- Add `@RestrictedRoute()` and `@UseGuards(JwtAuthGuard)` to the UserController class
- All user management operations (create, list, get, update, delete, reset-password) should require admin authentication
- This mirrors the pattern used by other admin controllers (discovery, history, settings, environment)
- Import guards from `~/modules/auth/guards/jwt-auth.guard` and `~/decorators/restricted.route`

**Definition of Done:**
- [ ] `@RestrictedRoute()` applied to UserController
- [ ] `@UseGuards(JwtAuthGuard)` applied to UserController
- [ ] `GET /users` without JWT returns 401
- [ ] `POST /users` without JWT returns 401
- [ ] `DELETE /users/:id` without JWT returns 401
- [ ] `bun run check-types` passes

**Verify:**
- `curl http://localhost:3000/users` returns 401
- `curl -H "Authorization: Bearer <valid-token>" http://localhost:3000/users` returns 200

---

## Open Questions
1. Should the `admin-serve` tests be part of the `api` project or get their own project? (Plan assumes own project.)

## Deferred Ideas
- **Phase B:** UI E2E test redesign — same fixture/cleanup improvements applied to UI tests
- **Phase B:** Multi-browser testing (Firefox, WebKit) — currently removed for simplicity
- **Phase C:** Plugin system E2E tests
- **Phase D:** CI/CD pipeline with automated E2E
- **Investigate:** Whether `@RestrictedRoute()` endpoints should return 403 or be invisible (404) to non-admin requests
