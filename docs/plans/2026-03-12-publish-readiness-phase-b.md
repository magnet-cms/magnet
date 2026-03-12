# Publish Readiness Audit — Phase B: UI, Plugins, CI/CD & Adapters

Created: 2026-03-12
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Complete publish readiness by: rewriting UI E2E tests to use Phase A fixtures, adding content-builder plugin API tests, removing docs E2E tests, creating a CI workflow for PRs, adding bundle size analysis, API response time checks, and writing Drizzle/Supabase adapter documentation.

**Architecture:** This builds on Phase A's E2E infrastructure (authTest fixture, CleanupManager, ApiClient). UI tests get fully rewritten to use these fixtures. A new CI workflow gates PRs with lint/type-check/build. Bundle analysis is added via Vite plugin. Adapter docs follow existing Mongoose docs pattern.

**Tech Stack:** Playwright, Vite (rollup-plugin-visualizer), GitHub Actions, NestJS, MDX (Fumadocs)

## Scope

### In Scope
- Full rewrite of all 7 UI E2E test files to use `authTest` fixture and `CleanupManager`
- Update page objects where they don't match actual UI
- Content-builder plugin API E2E tests (`/playground/schemas` CRUD)
- Remove docs E2E tests and `docs` Playwright project
- CI workflow for PR checks (lint, type-check, build)
- Fix existing publish workflow
- Vite bundle analyzer + CI size limit for admin UI
- API response time assertions in existing E2E tests
- Drizzle adapter documentation (`drizzle.mdx`)
- Supabase adapter documentation (`supabase.mdx`)

### Out of Scope
- SEO plugin (empty — `export {}`, nothing to test)
- New admin UI features (audit only, not building new ones)
- Drizzle/Supabase E2E testing (docs only, per user decision)
- Performance load testing (out of scope for v1.0)
- Documentation site E2E tests (user decision: remove them)

## Context for Implementer

> Phase A (plan `2026-03-12-publish-readiness-audit.md`) built the E2E foundation. This plan uses it.

- **Patterns to follow:**
  - API tests: `apps/e2e/tests/api/content.spec.ts` — uses `authTest`, `CleanupManager`, `ApiClient` methods
  - Auth fixture: `apps/e2e/src/fixtures/auth.fixture.ts` — provides `authenticatedApiClient` and `testUser`
  - Base fixture: `apps/e2e/src/fixtures/base.fixture.ts` — provides `apiClient`, `cleanup`, URLs
  - Mongoose adapter docs: `apps/docs/content/docs/adapters/mongoose.mdx` — pattern for adapter docs

- **Conventions:**
  - UI tests use `authTest` (from `auth.fixture.ts`) not raw `test` from Playwright
  - Page objects in `apps/e2e/src/page-objects/` — one per admin page
  - API tests in `tests/api/`, UI tests in `tests/ui/`
  - Docs use MDX in `apps/docs/content/docs/` with `meta.json` for navigation

- **Key files:**
  - `apps/e2e/playwright.config.ts` — project definitions (api, ui, admin-serve, docs)
  - `apps/e2e/src/helpers/api-client.ts` — HTTP client for API tests
  - `apps/e2e/src/helpers/test-data.ts` — test data factories
  - `packages/plugins/content-builder/src/backend/playground.controller.ts` — plugin API endpoints
  - `.github/workflows/publish.yml` — only existing CI workflow
  - `packages/client/admin/vite.config.lib.ts` — admin build config

- **Gotchas:**
  - The admin UI is served at `/admin` by NestJS (admin-serve module), NOT at the root
  - UI tests' `baseURL` is `http://localhost:3001` (Vite dev server), not the NestJS server
  - Content-builder plugin uses `@RestrictedRoute()` — API tests need auth
  - The `user-journey.spec.ts` is a single massive test — should be broken into focused tests
  - `ContentManagerPage.goto()` navigates to `content-manager` (no leading slash) — may not work with admin prefix

- **Domain context:**
  - Content-builder plugin provides a "Playground" for visual schema building via `/playground/schemas` CRUD API
  - Drizzle adapter supports PostgreSQL (Neon) and Supabase — two example apps show usage
  - Supabase adapter provides auth strategy + storage adapter (not a database adapter itself)

## Runtime Environment
- **Start:** `bun run dev:admin` (starts NestJS backend on :3000 + Vite admin on :3001)
- **Health check:** `GET http://localhost:3000/health`
- **Admin UI:** `http://localhost:3001/admin`
- **Restart:** Kill processes, re-run `bun run dev:admin`

## Assumptions
- The `authTest` fixture from Phase A works correctly for UI tests (provides `testUser` with `token`) — supported by `apps/e2e/src/fixtures/auth.fixture.ts` — Tasks 1-4 depend on this
- Content-builder plugin is loaded in the mongoose example app — supported by `apps/examples/mongoose/src/app.module.ts` — Task 5 depends on this
- The admin UI Vite build supports adding rollup plugins — supported by `packages/client/admin/vite.config.lib.ts` — Task 8 depends on this
- Drizzle Neon and Supabase example apps provide sufficient reference for documentation — supported by `apps/examples/drizzle-neon/` and `apps/examples/drizzle-supabase/` — Tasks 10-11 depend on this

## Testing Strategy
- UI E2E tests verified by `bun run test:e2e --project=ui`
- API E2E tests verified by `bun run test:e2e --project=api`
- CI workflow validated via `act` dry-run or manual review of YAML
- Bundle analysis validated by running build with visualizer
- Documentation validated by building docs site

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| UI element selectors break against actual running admin | High | Medium | Use resilient selectors (roles, labels, text) not CSS classes; test against running app |
| Content-builder plugin may not be registered in test app | Medium | High | Verify by checking `GET /playground/schemas` returns 200 before writing tests |
| Bundle size limit too aggressive | Low | Low | Start with generous limit (2MB), tighten over time |
| Drizzle adapter has undocumented features | Medium | Low | Reference example apps as source of truth for docs |

## Pre-Mortem

*Assume this plan failed. Most likely internal reasons:*

1. **UI tests pass in isolation but fail against real admin UI** (Tasks 1-4) → Trigger: Page objects use selectors that don't match actual DOM elements. Observable when first UI test file fails to find expected elements at runtime.
2. **CI workflow blocks all PRs due to pre-existing failures** (Task 7) → Trigger: `bun run check-types` or `bun run lint` fails on packages we didn't fix (e.g., `@magnet/docs` type errors, `@magnet-cms/ui` lint errors). Observable when reviewing CI YAML against known pre-existing failures from Phase A.
3. **Bundle size check is meaningless** (Task 8) → Trigger: We set a limit but can't actually run the build to get a baseline number because the admin package has missing dependencies. Observable if `bun run build --filter=@magnet-cms/admin` fails.

## Goal Verification

### Truths
1. `bun run test:e2e --project=ui` runs all rewritten UI tests with zero test files using raw `API_BASE_URL` or manual auth setup
2. `bun run test:e2e --project=api` includes content-builder plugin tests that exercise CRUD on `/playground/schemas`
3. No `tests/docs/` directory exists and no `docs` project in `playwright.config.ts`
4. `.github/workflows/ci.yml` exists with lint, type-check, and build jobs
5. `drizzle.mdx` and `supabase.mdx` exist in `apps/docs/content/docs/adapters/`
6. Admin build produces a bundle size report

### Artifacts
- `apps/e2e/tests/ui/*.spec.ts` — 7 rewritten UI test files (or fewer if consolidated)
- `apps/e2e/tests/api/playground.spec.ts` — content-builder plugin API tests
- `.github/workflows/ci.yml` — PR check workflow
- `apps/docs/content/docs/adapters/drizzle.mdx` — Drizzle adapter docs
- `apps/docs/content/docs/adapters/supabase.mdx` — Supabase adapter docs

### Key Links
- `authTest` fixture → all UI test files (auth setup)
- `CleanupManager` → UI test files with data creation (cleanup)
- `ApiClient` → `playground.spec.ts` (plugin API calls)
- `ci.yml` → `package.json` scripts (lint, check-types, build)
- `meta.json` → new MDX docs (navigation)

## Progress Tracking

- [x] Task 1: Rewrite auth & dashboard UI tests
- [x] Task 2: Rewrite content-manager UI tests
- [x] Task 3: Rewrite media, settings, account UI tests
- [x] Task 4: Rewrite user-journey and update page objects
- [x] Task 5: Add content-builder plugin API E2E tests
- [x] Task 6: Remove docs E2E tests and project config
- [x] Task 7: Create CI workflow for PR checks
- [x] Task 8: Add bundle size analysis and CI limit
- [x] Task 9: Add API response time assertions
- [x] Task 10: Write Drizzle adapter documentation
- [x] Task 11: Write Supabase adapter documentation

**Total Tasks:** 11 | **Completed:** 11 | **Remaining:** 0

## Implementation Tasks

### Task 1: Rewrite auth & dashboard UI tests

**Objective:** Rewrite `auth.spec.ts` and `dashboard.spec.ts` to use `authTest` fixture, eliminating duplicated auth setup code and using proper Playwright patterns.

**Dependencies:** None

**Files:**
- Modify: `apps/e2e/tests/ui/auth.spec.ts`
- Modify: `apps/e2e/tests/ui/dashboard.spec.ts`
- Modify: `apps/e2e/src/page-objects/login.page.ts` (if selectors need updating)
- Modify: `apps/e2e/src/page-objects/dashboard.page.ts` (if selectors need updating)

**Key Decisions / Notes:**
- Import `authTest` from `../../src/fixtures/auth.fixture` instead of raw `test` from Playwright
- Use `authenticatedApiClient` for API calls instead of raw `request` with manual auth
- Auth tests that don't need authentication (login form display, invalid credentials) can use `baseTest`
- Replace `page.waitForTimeout()` with proper waits (`waitForURL`, `waitForLoadState`, `expect().toBeVisible()`)
- Dashboard tests should use the `authTest` fixture for automatic auth — the `beforeEach` manual auth dance is eliminated
- Pattern: `apps/e2e/tests/api/content.spec.ts` shows proper fixture usage

**Definition of Done:**
- [ ] `auth.spec.ts` uses `baseTest` for unauthenticated tests and `authTest` for authenticated tests
- [ ] `dashboard.spec.ts` uses `authTest` — no manual register/login code
- [ ] Zero `page.waitForTimeout()` calls (use proper Playwright waits)
- [ ] Zero raw `API_BASE_URL` constants (use fixture-provided URLs)
- [ ] Tests pass type-check: `npx tsc --noEmit` in `apps/e2e`

**Verify:**
- `npx tsc --noEmit` (from apps/e2e)

---

### Task 2: Rewrite content-manager UI tests

**Objective:** Rewrite `content-manager.spec.ts` to use `authTest` and `CleanupManager`, eliminating shared mutable state (`createdDocs`) and ensuring proper cleanup.

**Dependencies:** Task 1

**Files:**
- Modify: `apps/e2e/tests/ui/content-manager.spec.ts`
- Modify: `apps/e2e/src/page-objects/content-manager.page.ts` (fix `goto()` path)

**Key Decisions / Notes:**
- The existing test uses `createdDocs` shared mutable state across serial tests — this is fragile. Instead, each test.describe block should create its own data via `authenticatedApiClient` and clean up via `CleanupManager`
- `ContentManagerPage.goto()` navigates to `content-manager` (no leading slash, no `/admin` prefix). The UI baseURL is `http://localhost:3001` so paths should work with Vite dev server routing. Verify this is correct.
- Tests that create content via API should use `cleanup.trackContent()` for cleanup
- The serial test mode (`test.describe.configure({ mode: 'serial' })`) can be kept for the versioning/publishing section since those tests genuinely depend on prior state
- Replace `page.waitForTimeout(1000)` with `page.waitForLoadState('networkidle')` or specific element waits

**Definition of Done:**
- [ ] No `createdDocs` shared mutable state at module scope
- [ ] Uses `authTest` fixture for all tests
- [ ] All created content tracked via `cleanup.trackContent()` or `cleanup.register()`
- [ ] `ContentManagerPage` paths work correctly with admin routing
- [ ] Tests pass type-check

**Verify:**
- `npx tsc --noEmit` (from apps/e2e)

---

### Task 3: Rewrite media, settings, account UI tests

**Objective:** Rewrite `media.spec.ts`, `settings.spec.ts`, and `account.spec.ts` to use `authTest` fixture.

**Dependencies:** Task 1

**Files:**
- Modify: `apps/e2e/tests/ui/media.spec.ts`
- Modify: `apps/e2e/tests/ui/settings.spec.ts`
- Modify: `apps/e2e/tests/ui/account.spec.ts`

**Key Decisions / Notes:**
- All three files have identical ~20-line `beforeEach` blocks doing manual auth — replace with `authTest` import
- Media tests that upload files should use `cleanup.trackMedia()` for cleanup
- Settings tests should be read-only (don't modify settings without restoring)
- Account tests navigate via dashboard user menu — verify page object methods work

**Definition of Done:**
- [ ] All three files import from `authTest` not raw `test`
- [ ] Zero manual auth setup code (no `beforeEach` with register/login)
- [ ] Media uploads tracked via `cleanup.trackMedia()` if any
- [ ] Tests pass type-check

**Verify:**
- `npx tsc --noEmit` (from apps/e2e)

---

### Task 4: Rewrite user-journey and update page objects

**Objective:** Rewrite `user-journey.spec.ts` to use fixtures, and audit/update all page objects for correctness.

**Dependencies:** Tasks 1-3

**Files:**
- Modify: `apps/e2e/tests/ui/user-journey.spec.ts`
- Modify: `apps/e2e/src/page-objects/content-manager.page.ts`
- Modify: `apps/e2e/src/page-objects/dashboard.page.ts`
- Modify: `apps/e2e/src/page-objects/index.ts`

**Key Decisions / Notes:**
- The current `user-journey.spec.ts` is one enormous test (~200+ lines). Break into a `test.describe` with focused tests using `authTest`
- Audit all page objects: verify `goto()` paths include `/admin` prefix where needed, selectors match actual UI components
- Remove `docs.page.ts` from page objects (docs tests being removed in Task 6)
- Update `index.ts` exports

**Definition of Done:**
- [ ] `user-journey.spec.ts` uses `authTest` fixture
- [ ] `docs.page.ts` removed from page objects
- [ ] All page object `goto()` methods use correct paths
- [ ] `index.ts` updated — no export of `DocsPage`
- [ ] Tests pass type-check

**Verify:**
- `npx tsc --noEmit` (from apps/e2e)

---

### Task 5: Add content-builder plugin API E2E tests

**Objective:** Add E2E tests for the content-builder plugin's `/playground/schemas` CRUD API.

**Dependencies:** None (independent of UI tasks)

**Files:**
- Create: `apps/e2e/tests/api/playground.spec.ts`
- Modify: `apps/e2e/src/helpers/api-client.ts` (add playground methods)

**Key Decisions / Notes:**
- The playground controller (`packages/plugins/content-builder/src/backend/playground.controller.ts`) exposes:
  - `GET /playground/schemas` — list schemas
  - `GET /playground/schemas/:name` — get schema
  - `POST /playground/schemas` — create schema (requires `CreateSchemaDto`)
  - `PUT /playground/schemas/:name` — update schema
  - `DELETE /playground/schemas/:name` — delete schema
  - `POST /playground/preview` — generate code preview
- All endpoints use `@RestrictedRoute()` — tests need `authenticatedApiClient`
- Add ApiClient methods: `listPlaygroundSchemas()`, `getPlaygroundSchema()`, `createPlaygroundSchema()`, `updatePlaygroundSchema()`, `deletePlaygroundSchema()`, `previewPlaygroundCode()`
- Schema names must match pattern `^[A-Z][A-Za-z0-9]*$`
- Test cleanup: delete any schemas created during tests via DELETE API. Note: createModule writes files to disk — DELETE must also remove them
- Use unique, non-colliding schema names per test run (e.g., `TestSchema${randomSuffix}`) to avoid conflicts between parallel/re-run tests
- Check `CreateSchemaDto` at `packages/plugins/content-builder/src/backend/dto/schema.dto.ts` for required fields

**Definition of Done:**
- [ ] Tests cover: list, create, get, update, delete
- [ ] POST /playground/preview tested separately (distinct path from /schemas/*)
- [ ] Tests verify 409 Conflict for duplicate schema names
- [ ] Tests verify 400 for invalid schema names
- [ ] Tests verify 404 for nonexistent schemas
- [ ] Unauthenticated 401 verified for at least create, list, and preview (class-level guard)
- [ ] All created schemas cleaned up via `CleanupManager` — use unique names with random suffix per test
- [ ] Verify DELETE /playground/schemas/:name removes generated files (not just schema record)
- [ ] Tests pass: `npx tsc --noEmit`

**Verify:**
- `npx tsc --noEmit` (from apps/e2e)

---

### Task 6: Remove docs E2E tests and project config

**Objective:** Remove the docs E2E test project, test files, and page object.

**Dependencies:** Task 4 (docs.page.ts removal)

**Files:**
- Delete: `apps/e2e/tests/docs/content.spec.ts`
- Delete: `apps/e2e/tests/docs/i18n.spec.ts`
- Delete: `apps/e2e/tests/docs/navigation.spec.ts`
- Delete: `apps/e2e/tests/docs/search.spec.ts`
- Delete: `apps/e2e/tests/docs/` (directory)
- Delete: `apps/e2e/src/page-objects/docs.page.ts`
- Modify: `apps/e2e/playwright.config.ts` (remove `docs` project)
- Modify: `apps/e2e/src/page-objects/index.ts` (remove DocsPage export)
- Modify: `apps/e2e/src/fixtures/base.fixture.ts` (remove `docsBaseURL` fixture)

**Key Decisions / Notes:**
- Remove the `docs` project from `playwright.config.ts` projects array
- Remove `DOCS_BASE_URL` constant from playwright config
- Remove `docsBaseURL` fixture from base.fixture.ts (no longer needed)
- Also remove DocsPage from page objects index if not already done in Task 4

**Definition of Done:**
- [ ] `tests/docs/` directory and all 4 files deleted
- [ ] `docs.page.ts` deleted
- [ ] `docs` project removed from playwright config
- [ ] `docsBaseURL` removed from base fixture
- [ ] `DOCS_BASE_URL` removed from playwright config
- [ ] `grep -r docsBaseURL apps/e2e` returns zero matches
- [ ] No remaining references to docs tests in codebase
- [ ] Type-check passes

**Verify:**
- `npx tsc --noEmit` (from apps/e2e)
- `grep -r "docs" apps/e2e/playwright.config.ts` returns no matches for docs project

---

### Task 7: Create CI workflow for PR checks

**Objective:** Create a GitHub Actions workflow that runs lint, type-check, and build on every PR.

**Dependencies:** None

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `.github/workflows/publish.yml` (fix Node.js version, add build step before publish)

**Key Decisions / Notes:**
- CI workflow triggers on `pull_request` to `main` and `push` to `main`
- Steps: checkout → setup Bun → setup Node → install → lint → type-check → build
- Known pre-existing failures to handle:
  - `@magnet/docs` has type errors in auto-generated `.source/server.ts` (exclude from check-types or accept failure)
  - `@magnet-cms/ui` has 617 lint errors (pre-existing CRLF issues — format before lint or exclude)
- Strategy: Run lint/type-check only on packages that matter for publishing. Verified package names: `@magnet-cms/core`, `@magnet-cms/common`, `@magnet-cms/e2e`, `create-magnet`
- Publish workflow: update Node.js from 18 to 20 (18 is EOL), add `bun run check-types` before publish
- Use `bun install --frozen-lockfile` for reproducible installs

**Definition of Done:**
- [ ] `.github/workflows/ci.yml` exists with lint, type-check, build jobs
- [ ] CI workflow triggers on PRs to main
- [ ] CI doesn't fail on pre-existing issues in docs/ui packages
- [ ] Publish workflow updated with Node.js 20 and pre-publish checks
- [ ] YAML is valid (no syntax errors)

**Verify:**
- Manual YAML review
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` (if pyyaml available)

---

### Task 8: Add bundle size analysis and CI limit

**Objective:** Add bundle size tracking for the admin UI and a CI check to prevent regressions.

**Dependencies:** Task 7

**Files:**
- Modify: `packages/client/admin/vite.config.ts` (add visualizer plugin — this is the main build config, `vite.config.lib.ts` is for the library export)
- Modify: `packages/client/admin/package.json` (add visualizer dependency, add `analyze` script)
- Modify: `.github/workflows/ci.yml` (add bundle size check step)

**Key Decisions / Notes:**
- Add `rollup-plugin-visualizer` as devDependency to admin package
- Add `"analyze": "ANALYZE=true bun run build"` script
- In `vite.config.ts` (NOT `vite.config.lib.ts` — verified that `"build": "vite build"` uses `vite.config.ts`), conditionally add visualizer plugin when `ANALYZE=true`
- For CI: run build, check total output size with `du -sh dist/` or parse Vite build output
- Start with a generous limit (2MB for JS bundle) — can tighten later
- Alternative: use `bundlesize` or `size-limit` npm packages for more precise control

**Definition of Done:**
- [ ] `rollup-plugin-visualizer` in admin devDependencies
- [ ] `bun run analyze` produces a `stats.html` file
- [ ] CI workflow checks admin build output size
- [ ] Build succeeds with visualizer: `bun run build --filter=@magnet-cms/admin`

**Verify:**
- `bun run build --filter=@magnet-cms/admin` (from monorepo root)

---

### Task 9: Add API response time assertions

**Objective:** Add response time checks to key API E2E tests to catch performance regressions.

**Dependencies:** None

**Files:**
- Modify: `apps/e2e/tests/api/health.spec.ts` (add timing assertion)
- Modify: `apps/e2e/tests/api/content.spec.ts` (add timing assertion to list/get)
- Modify: `apps/e2e/tests/api/auth.spec.ts` (add timing assertion to login)
- Modify: `apps/e2e/tests/api/discovery.spec.ts` (add timing assertion)

**Key Decisions / Notes:**
- Use Playwright's `response.timing()` or manual `Date.now()` before/after to measure
- Set generous thresholds: health < 500ms, CRUD operations < 2000ms, auth < 3000ms
- These are smoke-level performance checks, not load tests
- Only add to a few representative endpoints — not every single test
- If response time exceeds threshold, fail the test with a descriptive message

**Definition of Done:**
- [ ] Health endpoint has timing assertion (< 500ms)
- [ ] Content list has timing assertion (< 2000ms)
- [ ] Auth login has timing assertion (< 3000ms)
- [ ] Tests pass type-check

**Verify:**
- `npx tsc --noEmit` (from apps/e2e)

---

### Task 10: Write Drizzle adapter documentation

**Objective:** Create comprehensive documentation for the Drizzle adapter, following the Mongoose docs pattern.

**Dependencies:** None

**Files:**
- Create: `apps/docs/content/docs/adapters/drizzle.mdx`
- Modify: `apps/docs/content/docs/adapters/meta.json` (add drizzle page)

**Key Decisions / Notes:**
- Follow the structure of `apps/docs/content/docs/adapters/mongoose.mdx`
- Reference `apps/examples/drizzle-neon/` for Neon PostgreSQL setup
- Cover: installation, configuration (`dialect`, `driver`, `connectionString`), schema definition with `@Schema`/`@Prop`, supported dialects (postgresql, mysql, sqlite), Neon driver specifics
- Document `setDatabaseAdapter('drizzle')` requirement (must be called before schema imports)
- Reference `packages/adapters/drizzle/src/` for API details
- Include code examples from the example app

**Definition of Done:**
- [ ] `drizzle.mdx` exists with installation, configuration, schema definition, and examples
- [ ] `meta.json` updated to include drizzle in navigation
- [ ] Code examples are valid TypeScript
- [ ] References actual package names (`@magnet-cms/adapter-drizzle`)

**Verify:**
- File exists and has proper MDX frontmatter

---

### Task 11: Write Supabase adapter documentation

**Objective:** Create documentation for the Supabase adapter (auth strategy + storage adapter).

**Dependencies:** None

**Files:**
- Create: `apps/docs/content/docs/adapters/supabase.mdx`
- Modify: `apps/docs/content/docs/adapters/meta.json` (add supabase page — if not done in Task 10)

**Key Decisions / Notes:**
- Supabase adapter is NOT a database adapter — it provides auth strategy and storage adapter
- Reference `apps/examples/drizzle-supabase/` for combined Drizzle+Supabase setup
- Cover: installation, Supabase auth strategy configuration, Supabase storage adapter, integration with Drizzle for database
- Reference `packages/adapters/supabase/src/auth/supabase-auth.strategy.ts` and `packages/adapters/supabase/src/storage/supabase-storage.adapter.ts`
- Include Docker setup from `apps/examples/drizzle-supabase/docker/`

**Definition of Done:**
- [ ] `supabase.mdx` exists with auth strategy, storage adapter, and integration docs
- [ ] `meta.json` includes supabase in navigation
- [ ] Code examples reference actual package (`@magnet-cms/adapter-supabase`)
- [ ] Clearly states this is NOT a database adapter

**Verify:**
- File exists and has proper MDX frontmatter

---

## Open Questions

None — all questions resolved via user input.

### Deferred Ideas
- SEO plugin implementation and testing (currently empty)
- Drizzle/Supabase E2E testing (requires database setup in CI)
- Performance load testing with k6 or similar
- Visual regression testing for admin UI
