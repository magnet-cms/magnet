# Sentry Plugin Restructure Implementation Plan

Created: 2026-03-20
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Restructure the Sentry plugin to match the Stripe/Playground plugin patterns — fix the broken frontend wiring, reorganize backend into `src/backend/`, add Sentry API proxy for an admin error dashboard, and build a proper 3-page frontend (Dashboard, Issues, Settings) with the feedback widget.

**Architecture:** The Sentry plugin at `packages/plugins/sentry/` gets reorganized with `src/backend/` for all NestJS code and `src/admin/` for frontend. A new `SentryApiService` proxies calls to the Sentry Web API using an auth token. Three admin pages (Dashboard with metric cards + recent issues, Issues list table, Settings) are served via the plugin frontend system. The `@Plugin()` decorator gets the missing `frontend` metadata field so the admin UI actually loads the plugin bundle.

**Tech Stack:** `@sentry/nestjs` (backend), `@sentry/browser` (frontend feedback widget), NestJS, React, Sentry Web API (REST)

## Scope

### In Scope

- Fix `@Plugin()` decorator to include `frontend` metadata (routes, sidebar) — currently missing, so frontend never loads
- Reorganize backend files into `src/backend/` directory pattern (like Playground)
- Add `./backend` export path in `package.json` with barrel file
- Extend `SentryPluginConfig` with `authToken`, `organization`, `project` for Sentry API access
- Create `SentryApiService` that proxies Sentry REST API for issues, project stats
- Add admin API endpoints (`GET /sentry/admin/stats`, `GET /sentry/admin/issues`)
- Build Dashboard page with metric cards (total errors, unresolved issues, error rate) + recent issues
- Build Issues page with DataTable (title, status, count, last seen, assignee)
- Enhance existing Settings page with auth token status and API connectivity check
- Update frontend manifest to include child routes and proper sidebar structure
- Add missing peer dependencies (`@magnet-cms/admin`, `@magnet-cms/ui`, `@magnet-cms/utils`)
- Update all import paths in existing tests

### Out of Scope

- Session replay integration
- Source map upload automation
- Sentry release/deploy tracking
- Alert rules configuration from admin UI
- Performance page (deferred — can be added as follow-up)
- Modifying `create-magnet` CLI (already handled by previous plan)
- Documentation updates (separate task once implementation is verified)

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Plugin pattern to follow:** `packages/plugins/stripe/src/plugin.ts` — canonical reference for `@Plugin()` decorator with `frontend` field. Study how Stripe defines `frontend: { routes, sidebar }` with child routes and sidebar items (lines 18-80).
- **Frontend entry pattern:** `packages/plugins/stripe/src/admin/index.ts` — self-registration via `window.__MAGNET_PLUGINS__` with manifest, routes, sidebar, and lazy component imports.
- **Backend organization:** `packages/plugins/playground/src/backend/` — Playground keeps module, controller, service in `src/backend/` with a barrel `index.ts`. Follow this for Sentry.
- **Plugin registry:** `packages/core/src/modules/plugin/plugin-registry.service.ts:55-58` — reads `PLUGIN_FRONTEND_MANIFEST` metadata from the plugin class. Without the `frontend` field in `@Plugin()`, `getFrontendManifests()` at line 106 filters the plugin out — the admin UI never loads its bundle.
- **Admin UI components:** `@magnet-cms/admin` exports `PageHeader`, `PageContent`, `useAdapter`. `@magnet-cms/ui/components` exports `Card`, `Badge`, `DataTable`, `DataTableColumn`, `Skeleton`, `Select`, etc. `lucide-react` for icons.
- **Data fetching pattern:** `useAdapter().request<T>('/path')` — the adapter handles auth headers and base URL. See `packages/plugins/stripe/src/admin/pages/stripe-dashboard.tsx` for the canonical pattern with loading/error states.
- **API endpoint pattern:** Controllers use `@Controller('sentry')`, `@RestrictedRoute()` for auth, `@Get('admin/stats')` for endpoints. See `packages/plugins/stripe/src/stripe-api.controller.ts` lines 137-141.
- **Sentry Web API:** `GET /api/0/projects/{org}/{project}/issues/` returns issues. `GET /api/0/projects/{org}/{project}/stats/` returns event counts. Auth via `Authorization: Bearer {auth_token}` header. Base URL: `https://sentry.io` (configurable for self-hosted).
- **Existing Sentry files to move:**
  - `src/controllers/sentry-config.controller.ts` → `src/backend/controllers/sentry-config.controller.ts`
  - `src/interceptors/sentry-context.interceptor.ts` → `src/backend/interceptors/sentry-context.interceptor.ts`
  - `src/decorators/sentry-span.decorator.ts` → `src/backend/decorators/sentry-span.decorator.ts`
  - `src/decorators/sentry-cron.decorator.ts` → `src/backend/decorators/sentry-cron.decorator.ts`
  - `src/helpers/span.ts` → `src/backend/helpers/span.ts`
  - `src/sentry.module.ts` → `src/backend/sentry.module.ts`
  - `src/plugin.ts` → `src/backend/plugin.ts` (or keep at `src/plugin.ts` like Stripe — see notes)
  - `src/constants.ts` → `src/backend/constants.ts`
  - `src/instrumentation.ts` → `src/backend/instrumentation.ts`
  - `src/types.ts` → `src/backend/types.ts`
- **Gotchas:**
  - The `SentryModule` uses `require('./plugin')` in its `useFactory` — after moving, both `sentry.module.ts` and `plugin.ts` are in `src/backend/`, so `require('./plugin')` stays UNCHANGED. Do NOT change this to `require('../plugin')`.
  - `src/index.ts` re-exports `SENTRY_OPTIONS` from `'./sentry.module'` — after moving, this must change to `'./backend/sentry.module'` or re-export via the barrel `'./backend'`. Missing this will break consumers importing `SENTRY_OPTIONS` from the package.
  - The `@sentry/browser` import in the frontend is dynamic (`await import('@sentry/browser')`) and must stay that way for tree-shaking.
  - Sentry API auth tokens are sensitive — never expose them to the frontend. The backend proxies all API calls.

## Runtime Environment

- **Start command:** `bun run dev` (monorepo) or `bun run dev` in example apps
- **Port:** 3000 (default)
- **Health check:** `GET /health`

## Assumptions

- Sentry Web API at `https://sentry.io/api/0/` is the standard base URL for cloud-hosted Sentry — Tasks 3, 4, 5 depend on this.
- Sentry API auth tokens provide read access to project issues and stats — verified by Sentry docs. Tasks 3, 4 depend on this.
- The `window.__MAGNET_PLUGINS__` registry supports `widgets` field for global components (the feedback widget) — verified in Sentry's existing `admin/index.ts`. Task 6 depends on this.
- Moving files within the package doesn't affect the tsup build output since `src/index.ts` re-exports everything — supported by tsup entry point behavior. Task 1 depends on this.
- `@magnet-cms/ui/components` exports `DataTable` and `DataTableColumn` — verified in Stripe's `payments.tsx` import. Task 5 depends on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Moving files breaks import paths in tests | High | Low | Update all imports systematically; run tests after each file move |
| Sentry API rate limiting on stats/issues endpoints | Low | Medium | Cache responses for 60s in `SentryApiService`; show stale data with "last updated" timestamp |
| Auth token not configured — dashboard shows empty state | Medium | Low | Graceful degradation: show "Configure Sentry API token" card with setup instructions when `authToken` is missing |
| Self-hosted Sentry has different API paths | Low | Medium | Make `sentryUrl` configurable (default `https://sentry.io`); document self-hosted setup |

## Goal Verification

### Truths

1. The Sentry plugin frontend bundle is loaded by the admin UI (visible in `GET /plugins/manifests` response)
2. The Dashboard page displays metric cards and a recent issues list when `authToken` is configured
3. The Issues page shows a DataTable of Sentry issues with status, count, and last seen
4. The Settings page shows connection status, DSN, and API token connectivity
5. The feedback widget renders as a floating button in the admin UI
6. Backend files are organized under `src/backend/` with a barrel export at `src/backend/index.ts`
7. `bun run check-types` passes across the entire monorepo
8. All existing and new tests pass

### Artifacts

1. `packages/plugins/sentry/src/backend/plugin.ts` — Plugin with `frontend` metadata in `@Plugin()`
2. `packages/plugins/sentry/src/backend/index.ts` — Backend barrel export
3. `packages/plugins/sentry/src/backend/services/sentry-api.service.ts` — Sentry REST API proxy
4. `packages/plugins/sentry/src/backend/controllers/sentry-admin.controller.ts` — Admin API endpoints
5. `packages/plugins/sentry/src/admin/pages/sentry-dashboard.tsx` — Dashboard page
6. `packages/plugins/sentry/src/admin/pages/sentry-issues.tsx` — Issues list page
7. `packages/plugins/sentry/src/admin/pages/sentry-settings.tsx` — Enhanced settings page

## Progress Tracking

- [x] Task 1: Reorganize backend files into `src/backend/` structure
- [x] Task 2: Fix `@Plugin()` decorator with `frontend` metadata and update frontend manifest
- [x] Task 3: Extend config and create `SentryApiService` for Sentry REST API proxy
- [x] Task 4: Add admin API endpoints for dashboard and issues data
- [x] Task 5: Build Dashboard and Issues frontend pages
- [x] Task 6: Enhance Settings page and update frontend entry with child routes
- [x] Task 7: Update tests and final verification

**Total Tasks:** 7 | **Completed:** 7 | **Remaining:** 0

## Implementation Tasks

### Task 1: Reorganize Backend Files into `src/backend/` Structure

**Objective:** Move all backend NestJS code into `src/backend/` directory following the Playground plugin pattern. Create a barrel export file. Update `package.json` with `./backend` export path.

**Dependencies:** None

**Files:**

- Move: `src/plugin.ts` → `src/backend/plugin.ts`
- Move: `src/sentry.module.ts` → `src/backend/sentry.module.ts`
- Move: `src/constants.ts` → `src/backend/constants.ts`
- Move: `src/types.ts` → `src/backend/types.ts`
- Move: `src/instrumentation.ts` → `src/backend/instrumentation.ts`
- Move: `src/controllers/sentry-config.controller.ts` → `src/backend/controllers/sentry-config.controller.ts`
- Move: `src/interceptors/sentry-context.interceptor.ts` → `src/backend/interceptors/sentry-context.interceptor.ts`
- Move: `src/decorators/sentry-span.decorator.ts` → `src/backend/decorators/sentry-span.decorator.ts`
- Move: `src/decorators/sentry-cron.decorator.ts` → `src/backend/decorators/sentry-cron.decorator.ts`
- Move: `src/helpers/span.ts` → `src/backend/helpers/span.ts`
- Create: `src/backend/index.ts` (barrel export)
- Modify: `src/index.ts` (update imports to point at `./backend/`)
- Modify: `package.json` (add `./backend` export path)
- Modify: `tsup.config.ts` (add `src/backend/index.ts` as entry)

**Key Decisions / Notes:**

- Follow Playground pattern: `src/backend/` with subdirectories for `controllers/`, `interceptors/`, `decorators/`, `helpers/`
- The `plugin.ts` stays accessible from the package root via `src/index.ts` re-export
- `SentryModule`'s `useFactory` uses `require('./plugin')` — after moving, this becomes `require('../plugin')` if plugin is at `src/backend/plugin.ts`, or stays `require('./plugin')` if both are in `src/backend/`
- The barrel `src/backend/index.ts` follows `packages/plugins/stripe/src/backend/index.ts` pattern — exports plugin, module, services, types
- **Critical:** In `src/index.ts`, the line `export { SENTRY_OPTIONS } from './sentry.module'` must change to `export { SENTRY_OPTIONS } from './backend/sentry.module'` (or re-export via `'./backend'`). This is a concrete breakage point if missed.
- Both `sentry.module.ts` and `plugin.ts` move into `src/backend/`, so the `require('./plugin')` in the module's `useFactory` stays unchanged — do NOT update this path
- Delete the now-empty `src/controllers/`, `src/interceptors/`, `src/decorators/`, `src/helpers/` directories after moving

**Definition of Done:**

- [ ] All backend files live under `src/backend/`
- [ ] `src/backend/index.ts` barrel exports all public symbols
- [ ] `src/index.ts` re-exports from `./backend/`
- [ ] `package.json` has `./backend` export path
- [ ] `bun run check-types` passes
- [ ] `bun test` passes (all existing tests still work)

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types && cd packages/plugins/sentry && bun test`

---

### Task 2: Fix `@Plugin()` Decorator with `frontend` Metadata and Update Frontend Manifest

**Objective:** Add the `frontend: { routes, sidebar }` field to the `@Plugin()` decorator on `SentryPlugin`, matching the Stripe/Playground pattern. This is the critical fix — without it, the admin UI never loads the Sentry frontend bundle.

**Dependencies:** Task 1

**Files:**

- Modify: `src/backend/plugin.ts`
- Modify: `src/admin/index.ts`
- Modify: `package.json` (add missing peer deps for frontend)

**Key Decisions / Notes:**

- Add `frontend` field to `@Plugin()` with 3 routes: Dashboard (`/sentry`), Issues (`/sentry/issues`), Settings (`/sentry/settings`)
- Sidebar structure: parent "Sentry" item with children (Dashboard, Issues, Settings) — matches Stripe's sidebar pattern with child items
- Keep `widgets` in the frontend manifest for the feedback widget (global mount)
- The `@Plugin()` decorator's `frontend` metadata is read by `PluginRegistryService.discoverPlugins()` at `packages/core/src/modules/plugin/plugin-registry.service.ts:55-58` and stored as `PLUGIN_FRONTEND_MANIFEST`
- `getFrontendManifests()` at line 106 uses this to generate `bundleUrl: /plugins/assets/sentry/bundle.iife.js`
- Add missing peer deps to `package.json`: `@magnet-cms/admin`, `@magnet-cms/ui`, `@magnet-cms/utils` — these are currently only in devDeps but the Stripe pattern has them as peer deps too
- Update `src/admin/index.ts` manifest to match the routes defined in `@Plugin()` decorator

**Definition of Done:**

- [ ] `@Plugin()` on `SentryPlugin` includes `frontend: { routes, sidebar }` matching Stripe pattern
- [ ] Frontend manifest in `src/admin/index.ts` matches decorator routes
- [ ] `package.json` peer deps include `@magnet-cms/admin`, `@magnet-cms/ui`, `@magnet-cms/utils`
- [ ] `bun run check-types` passes
- [ ] Plugin appears in `GET /plugins/manifests` with `bundleUrl` (verifiable via E2E test or manual check)

**Verify:**

- `cd /home/gjsoa/code/magnet && bun run check-types`

---

### Task 3: Extend Config and Create `SentryApiService`

**Objective:** Add `authToken`, `organization`, `project`, and `sentryUrl` fields to `SentryPluginConfig`. Create a `SentryApiService` that proxies requests to Sentry's REST API with response caching.

**Dependencies:** Task 1

**Files:**

- Modify: `src/backend/types.ts` (add new config fields + response types)
- Create: `src/backend/services/sentry-api.service.ts`
- Modify: `src/backend/sentry.module.ts` (register SentryApiService)
- Modify: `src/backend/plugin.ts` (resolve new config fields from env vars)
- Create: `src/backend/__tests__/sentry-api.service.test.ts`

**Key Decisions / Notes:**

- New config fields in `SentryPluginConfig`:
  - `authToken?: string` — Sentry API auth token, auto-resolved from `SENTRY_AUTH_TOKEN` env var
  - `organization?: string` — Sentry org slug, auto-resolved from `SENTRY_ORG`
  - `project?: string` — Sentry project slug, auto-resolved from `SENTRY_PROJECT`
  - `sentryUrl?: string` — Base URL (default `https://sentry.io`), auto-resolved from `SENTRY_URL`
- `SentryApiService` methods:
  - `getProjectStats(): Promise<SentryProjectStats>` — `GET /api/0/projects/{org}/{project}/stats/`
  - `getIssues(query?: string, cursor?: string): Promise<SentryIssue[]>` — `GET /api/0/projects/{org}/{project}/issues/`
  - `isConfigured(): boolean` — returns true if authToken, org, project are all set
- Cache responses for 60 seconds using a simple in-memory TTL cache (Map with timestamps)
- Use native `fetch()` (available in Bun/Node 18+) for HTTP calls — no extra dependencies
- Auth via `Authorization: Bearer {auth_token}` header
- Response types: `SentryProjectStats`, `SentryIssue` defined in types.ts
- Inject `SENTRY_OPTIONS` to access config

**Definition of Done:**

- [ ] `SentryApiService.getProjectStats()` returns project stats from Sentry API
- [ ] `SentryApiService.getIssues()` returns issues list from Sentry API
- [ ] `SentryApiService.isConfigured()` returns false when authToken/org/project missing
- [ ] Response caching works (same request within 60s returns cached data)
- [ ] Unit tests verify API calls with mocked fetch, caching, and missing config behavior
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet/packages/plugins/sentry && bun test`

---

### Task 4: Add Admin API Endpoints

**Objective:** Create admin-only API endpoints that the frontend dashboard and issues page will call. These proxy data from `SentryApiService`.

**Dependencies:** Task 3

**Files:**

- Create: `src/backend/controllers/sentry-admin.controller.ts`
- Modify: `src/backend/sentry.module.ts` (register new controller)
- Create: `src/backend/__tests__/sentry-admin.controller.test.ts`

**Key Decisions / Notes:**

- Endpoints (all under `@Controller('sentry')`, `@RestrictedRoute()`):
  - `GET /sentry/admin/stats` — returns `{ totalErrors, unresolvedIssues, errorsLast24h, isConfigured }`. Falls back to `{ isConfigured: false }` when API token not set.
  - `GET /sentry/admin/issues` — returns `SentryIssue[]` (title, status, count, lastSeen, assignedTo, shortId, permalink). Optional `?query=` param for search.
  - `GET /sentry/admin/status` — returns `{ connected, organization, project, lastSync }` for settings page connectivity check.
- Reuse existing `GET /sentry/config` endpoint (already in `sentry-config.controller.ts`) — no changes needed.
- Follow Stripe's pattern at `stripe-api.controller.ts:137-141` for admin endpoint structure.
- Keep the existing `SentryConfigController` for frontend config — the new `SentryAdminController` is for dashboard data.

**Definition of Done:**

- [ ] `GET /sentry/admin/stats` returns stats shape with metric values (or `isConfigured: false`)
- [ ] `GET /sentry/admin/issues` returns issues array
- [ ] `GET /sentry/admin/status` returns connectivity status
- [ ] All endpoints require authentication via `@RestrictedRoute()`
- [ ] Unit tests verify controller methods with mocked `SentryApiService`
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet/packages/plugins/sentry && bun test`

---

### Task 5: Build Dashboard and Issues Frontend Pages

**Objective:** Create the Dashboard page with metric cards and recent issues, and the Issues page with a full DataTable. Follow the Stripe dashboard pattern.

**Dependencies:** Task 2, Task 4

**Files:**

- Create: `src/admin/pages/sentry-dashboard.tsx`
- Create: `src/admin/pages/sentry-issues.tsx`
- Create: `src/admin/components/error-metrics.tsx`
- Create: `src/admin/components/recent-issues.tsx`

**Key Decisions / Notes:**

- **Dashboard page** (`/sentry`):
  - 3 metric cards in a grid: "Unresolved Issues" (AlertTriangle icon), "Errors (24h)" (Bug icon), "Total Errors" (BarChart3 icon)
  - Below: "Recent Issues" table showing last 5 issues (title, status badge, count, last seen)
  - When `isConfigured: false`, show a setup card with instructions to add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to env
  - Use `useAdapter().request<T>('/sentry/admin/stats')` and `/sentry/admin/issues?limit=5`
  - Loading skeleton matching Stripe's `DashboardSkeleton` pattern
- **Issues page** (`/sentry/issues`):
  - Full DataTable with columns: Title, Status (badge), Events (count), Last Seen (relative time), Assigned To
  - Each row links to Sentry permalink (external link)
  - Use `DataTable` from `@magnet-cms/ui/components` — same pattern as Stripe's payments page
  - Empty state: "No issues found" message
- **Component patterns:**
  - `ErrorMetrics` component: 3-column grid of `MetricCard` components (like Stripe's `SubscriptionMetrics`)
  - `RecentIssues` component: simplified table using `DataTable` with limited rows
- Icons from `lucide-react`: `AlertTriangle`, `Bug`, `BarChart3`, `ExternalLink`, `Shield`

**Definition of Done:**

- [ ] Dashboard page renders metric cards with data from `/sentry/admin/stats`
- [ ] Dashboard page shows recent issues from `/sentry/admin/issues`
- [ ] Dashboard shows setup instructions when API is not configured
- [ ] Issues page renders full DataTable with all columns
- [ ] Loading/error/empty states handled for both pages
- [ ] `bun run build` in plugin dir succeeds (frontend bundle builds)
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet/packages/plugins/sentry && bun run build`

---

### Task 6: Enhance Settings Page and Update Frontend Entry

**Objective:** Enhance the existing Settings page to show API token connectivity status, and update the frontend entry (`admin/index.ts`) to register all 3 pages with proper routes.

**Dependencies:** Task 5

**Files:**

- Modify: `src/admin/pages/sentry-settings.tsx`
- Modify: `src/admin/index.ts`

**Key Decisions / Notes:**

- **Settings page enhancements:**
  - Add "API Connection" card showing: organization, project slug, connection status (connected/disconnected badge)
  - Fetch from `GET /sentry/admin/status`
  - Keep existing "Connection Status" card with DSN/environment
  - Add "Feedback Widget" section showing widget status
- **Frontend entry (`admin/index.ts`):**
  - Update manifest routes to include child routes: `''` (Dashboard), `'issues'` (Issues), `'settings'` (Settings)
  - Update sidebar to include child items matching Stripe's pattern
  - Update component map to include `SentryDashboard`, `SentryIssues`, `SentrySettings`
  - Keep `SentryFeedbackWidget` as a global widget
- Follow Stripe's `admin/index.ts` pattern exactly: manifest with routes/sidebar/widgets, components map with lazy imports, `registerPlugin()` function

**Definition of Done:**

- [ ] Settings page shows API connection status card
- [ ] Frontend manifest includes all 3 routes with correct componentIds
- [ ] Sidebar has parent "Sentry" item with child items (Dashboard, Issues, Settings)
- [ ] All components lazy-loaded via `import()` in components map
- [ ] `bun run build` succeeds (frontend bundle builds)
- [ ] `bun run check-types` passes

**Verify:**

- `cd /home/gjsoa/code/magnet/packages/plugins/sentry && bun run build`

---

### Task 7: Update Tests and Final Verification

**Objective:** Update all existing test imports to match new `src/backend/` paths, add tests for new code, and run full verification.

**Dependencies:** Tasks 1-6

**Files:**

- Move: `src/__tests__/` → `src/backend/__tests__/` (update all import paths)
- Modify: All test files (update relative imports from `../` to match new locations)
- Create: `src/backend/__tests__/sentry-api.service.test.ts` (if not done in Task 3)
- Create: `src/backend/__tests__/sentry-admin.controller.test.ts` (if not done in Task 4)

**Key Decisions / Notes:**

- All test files move from `src/__tests__/` to `src/backend/__tests__/`
- Update import paths: `../plugin` → `../plugin`, `../constants` → `../constants` (relative paths within backend stay same)
- Run `bun test` to verify all existing tests pass with new paths
- Run `bun run check-types` for full monorepo type check
- Run `bun run build` in plugin dir to verify frontend + backend build
- E2E tests (existing in `apps/e2e/tests/api/sentry-plugin.spec.ts`) should still pass

**Definition of Done:**

- [ ] All test files moved to `src/backend/__tests__/`
- [ ] All existing tests pass (0 failures)
- [ ] New `SentryApiService` tests pass
- [ ] New `SentryAdminController` tests pass
- [ ] `bun run check-types` passes (monorepo)
- [ ] `bun run build` succeeds in plugin dir (backend + frontend)
- [ ] No TypeScript errors introduced

**Verify:**

- `cd /home/gjsoa/code/magnet/packages/plugins/sentry && bun test && bun run build && cd /home/gjsoa/code/magnet && bun run check-types`

## Open Questions

1. **Should the Sentry API service handle pagination for issues?** The Sentry API uses cursor-based pagination. For the initial implementation, we'll fetch the first page (25 items) with an optional search query. Pagination can be added later if needed.
2. **Should the dashboard auto-refresh?** Could add a 60-second auto-refresh interval to keep stats current. Recommend as a follow-up enhancement.

## Deferred Ideas

- **Performance page:** Web vitals, transaction durations, slowest endpoints — requires more Sentry API endpoints and charting
- **Alert rules management:** Configure Sentry alert rules from the admin UI
- **Issue actions:** Resolve/ignore issues directly from the admin Issues page via Sentry API
- **Auto-refresh dashboard:** Polling interval for real-time stats updates
