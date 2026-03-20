# Sentry Multi-Project & Scope Discovery Implementation Plan

Created: 2026-03-20
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add a Projects page to the Sentry plugin that lists all organization projects via DataTable (identifying which is the active Magnet project), and add token scope probing to surface which API features are available based on the auth token's permissions.

**Architecture:** Backend adds two new SentryApiService methods (`getOrganizationProjects`, `probeTokenScopes`) and two new admin controller endpoints. Frontend adds a new Projects page using DataTable from `@magnet-cms/ui/components`. The active project comes from `SENTRY_PROJECT` env var (read-only — no runtime switching). Token scopes are probed by making lightweight requests to known Sentry endpoints and checking for 200 vs 403.

**Tech Stack:** NestJS (backend), React + DataTable (frontend), Sentry REST API v0

## Scope

### In Scope

- Backend: List organization projects via Sentry API
- Backend: Probe token scopes (org:read, project:read, event:read, alerts:read)
- Backend: New admin endpoints: `GET /sentry/admin/projects`, `GET /sentry/admin/scopes`
- Frontend: New Projects page with DataTable (name, slug, platform, error count, active badge)
- Frontend: Sidebar entry for Projects page
- Frontend: Enhanced Settings page showing detected token scopes
- Tests for all new backend methods and controller endpoints

### Out of Scope

- Runtime project switching from UI (project selection is env-var based)
- Per-project detailed stats (only basic error count from org-level stats)
- Alerts page or alerts-related features
- Changes to the existing Dashboard or Issues pages

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - `packages/plugins/sentry/src/backend/services/sentry-api.service.ts` — existing service with `fetchCached()` pattern for Sentry API calls
  - `packages/plugins/sentry/src/admin/pages/sentry-issues.tsx` — existing page using DataTable from `@magnet-cms/ui/components`
  - `packages/plugins/stripe/src/admin/pages/products.tsx` — reference for DataTable with toolbar, pagination, and content-manager variant
  - `packages/plugins/sentry/src/backend/__tests__/sentry-admin.controller.test.ts` — test pattern with `importController()` workaround for Bun/NestJS decorator compatibility

- **Conventions:**
  - DataTable imports: `import { DataTable, type DataTableColumn } from '@magnet-cms/ui/components'`
  - Admin page pattern: `PageHeader` + `PageContent` from `@magnet-cms/admin`, `useAdapter()` for API calls
  - Backend tests: `bun:test` framework (describe/it/expect/mock), mock service methods via `mock()`, use `importController()` try/catch pattern for NestJS decorators

- **Key files:**
  - `packages/plugins/sentry/src/backend/types.ts` — all shared TypeScript types
  - `packages/plugins/sentry/src/backend/constants.ts` — `SENTRY_OPTIONS` injection token
  - `packages/plugins/sentry/src/backend/sentry.module.ts` — NestJS module (controllers + providers)
  - `packages/plugins/sentry/src/backend/plugin.ts` — `@Plugin()` decorator with frontend routes/sidebar
  - `packages/plugins/sentry/src/admin/index.ts` — frontend manifest + component registry

- **Gotchas:**
  - `isConfigured()` requires authToken + organization + project. For listing projects, we only need authToken + organization. Add an `isOrgConfigured()` method.
  - The `fetchCached()` method returns cached data for 60s. Scope probing results should be cached longer (5 min) since scopes rarely change.
  - NestJS HTTP decorators (`@Get`, `@Post`) throw on first import in Bun's decorator context — tests use a try/catch-then-retry `importController()` pattern.
  - Frontend plugin routes and sidebar are declared in TWO places: `plugin.ts` (backend `@Plugin()` decorator) and `admin/index.ts` (frontend manifest). Both must be updated.

- **Domain context:**
  - Sentry REST API: `GET /api/0/organizations/{org}/projects/` lists all projects (needs `org:read` or `project:read` scope)
  - Token scope probing: Sentry has no "list my scopes" endpoint. We probe by calling known endpoints and checking response status (200=has scope, 403=missing scope).
  - Probing endpoints: `GET /api/0/organizations/{org}/` (org:read), `GET /api/0/organizations/{org}/projects/?per_page=1` (project:read), `GET /api/0/projects/{org}/{project}/issues/?limit=1` (event:read), `GET /api/0/organizations/{org}/alert-rules/?per_page=1` (alerts:read)

## Assumptions

- Sentry API `GET /api/0/organizations/{org}/projects/` returns objects with at least: `id`, `slug`, `name`, `platform`, `status` — supported by Sentry REST API docs — Tasks 1, 3 depend on this
- Token scope probing via HTTP status codes (200 vs 403) reliably indicates scope availability — Tasks 1, 2, 5 depend on this
- The org projects endpoint requires `org:read` or `project:read` scope — Task 1 depends on this
- The user's token has at minimum `org:read` and `project:read` scopes — Task 3 depends on this (graceful fallback if missing)

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Sentry API rate limiting on scope probes | Low | Medium | Cache probe results for 5 minutes; probes use `per_page=1`/`limit=1` to minimize data |
| Org has many projects (100+) | Low | Low | Intentionally limited to first page (100 projects). DataTable client-side pagination handles display. Add UI note when results may be truncated (response length = 100). |
| Scope probe endpoint returns unexpected status (500, 429) | Medium | Low | Treat non-200/non-403 as "unknown" scope status, don't fail the whole request |

## Goal Verification

### Truths

1. `GET /sentry/admin/projects` returns a list of all organization projects with name, slug, platform, error count, and identifies the active project
2. `GET /sentry/admin/scopes` returns detected token scopes (org:read, project:read, event:read, alerts:read) with true/false for each
3. The Projects page displays a DataTable with columns: Name, Slug, Platform, Errors (24h), Active badge
4. The active project (matching `SENTRY_PROJECT` env var) shows a "Current" badge in the table
5. The Settings page displays detected token scopes with availability indicators
6. All new backend methods have passing unit tests
7. Frontend builds successfully with no TypeScript errors

### Artifacts

1. `packages/plugins/sentry/src/backend/services/sentry-api.service.ts` — `getOrganizationProjects()` and `probeTokenScopes()` methods
2. `packages/plugins/sentry/src/backend/controllers/sentry-admin.controller.ts` — `getProjects()` and `getScopes()` endpoints
3. `packages/plugins/sentry/src/backend/types.ts` — `SentryProject` and `SentryTokenScopes` types
4. `packages/plugins/sentry/src/admin/pages/sentry-projects.tsx` — Projects page with DataTable
5. `packages/plugins/sentry/src/backend/__tests__/sentry-api.service.test.ts` — tests for new methods
6. `packages/plugins/sentry/src/backend/__tests__/sentry-admin.controller.test.ts` — tests for new endpoints

## Progress Tracking

- [x] Task 1: Backend types and SentryApiService methods
- [x] Task 2: Backend admin controller endpoints
- [x] Task 3: Frontend Projects page with DataTable
- [x] Task 4: Route and sidebar registration
- [x] Task 5: Enhanced Settings page with scope display

**Total Tasks:** 5 | **Completed:** 5 | **Remaining:** 0

## Implementation Tasks

### Task 1: Backend Types and SentryApiService Methods

**Objective:** Add TypeScript types for Sentry projects and token scopes, and implement two new methods on SentryApiService.

**Dependencies:** None

**Files:**

- Modify: `packages/plugins/sentry/src/backend/types.ts`
- Modify: `packages/plugins/sentry/src/backend/services/sentry-api.service.ts`
- Modify: `packages/plugins/sentry/src/backend/__tests__/sentry-api.service.test.ts`

**Key Decisions / Notes:**

- Add `SentryProject` interface: `{ id: string; slug: string; name: string; platform: string | null; status: string; dateCreated: string; isActive: boolean; errorCount: number | null }` — `isActive` is computed by comparing slug to configured project. `errorCount` is populated from the org-level stats endpoint if available, otherwise null.
- Add `SentryTokenScopes` interface: `{ orgRead: boolean; projectRead: boolean; eventRead: boolean; alertsRead: boolean }`
- Add `isOrgConfigured(): boolean` that checks only `authToken` and `organization` (unlike `isConfigured()` which also requires `project`)
- `getOrganizationProjects()`: calls `GET /api/0/organizations/{org}/projects/`, maps results to `SentryProject[]`, sets `isActive` flag by comparing each project's slug to `this.project`. Populates `errorCount` from each project's embedded stats if the API returns them (Sentry includes stats when `?statsPeriod=24h` is set), otherwise null.
- `probeTokenScopes()`: makes 4 lightweight GET requests with `limit=1`/`per_page=1`, returns `SentryTokenScopes`. Uses a dedicated `scopeCache: { data: SentryTokenScopes; expiresAt: number } | undefined` field (not the URL-keyed `fetchCached()` — there's only one scope result). Cache TTL: `Date.now() + 300_000` (5 minutes). Non-200/non-403 responses = `false` (unknown treated as unavailable). When project is not configured (`isConfigured()` false but `isOrgConfigured()` true), skip the event:read probe and return `eventRead: false` without making a request.
- Scope probe endpoints:
  - `org:read` → `GET /api/0/organizations/{org}/`
  - `project:read` → `GET /api/0/organizations/{org}/projects/?per_page=1`
  - `event:read` → requires project configured: `GET /api/0/projects/{org}/{project}/issues/?limit=1`
  - `alerts:read` → `GET /api/0/organizations/{org}/alert-rules/?per_page=1`

**Definition of Done:**

- [ ] `SentryProject` and `SentryTokenScopes` types exist in types.ts
- [ ] `isOrgConfigured()` returns true when authToken + organization are set
- [ ] `getOrganizationProjects()` returns project list with `isActive` flag and `errorCount`
- [ ] `probeTokenScopes()` returns scope availability object
- [ ] `probeTokenScopes()` returns `eventRead: false` without making a request when project is not configured
- [ ] Scope probe results use dedicated `scopeCache` field with 5-minute TTL
- [ ] Tests cover: projects fetch, active project detection, errorCount mapping, scope probing (all scopes, partial scopes, API errors, missing project for event:read)
- [ ] All tests pass

**Verify:**

- `cd packages/plugins/sentry && bun test src/backend/__tests__/sentry-api.service.test.ts`

---

### Task 2: Backend Admin Controller Endpoints

**Objective:** Add two new REST endpoints to the admin controller for projects listing and scope checking.

**Dependencies:** Task 1

**Files:**

- Modify: `packages/plugins/sentry/src/backend/controllers/sentry-admin.controller.ts`
- Modify: `packages/plugins/sentry/src/backend/__tests__/sentry-admin.controller.test.ts`

**Key Decisions / Notes:**

- `GET /sentry/admin/projects` → calls `sentryApi.getOrganizationProjects()`, returns `SentryProject[]`. Returns empty array if org not configured. Catches `BadGatewayException` and returns empty array (same pattern as `getIssues`).
- `GET /sentry/admin/scopes` → calls `sentryApi.probeTokenScopes()`, returns `SentryTokenScopes`. Returns all-false if org not configured.
- Both endpoints use `@RestrictedRoute()` decorator (existing pattern)
- Follow existing error handling pattern: catch `BadGatewayException`, return graceful fallback

**Definition of Done:**

- [ ] `GET /sentry/admin/projects` returns org project list
- [ ] `GET /sentry/admin/scopes` returns token scope availability
- [ ] Endpoints return graceful fallback when not configured or API errors
- [ ] Tests cover: configured + unconfigured states, API error handling
- [ ] All tests pass

**Verify:**

- `cd packages/plugins/sentry && bun test src/backend/__tests__/sentry-admin.controller.test.ts`

---

### Task 3: Frontend Projects Page with DataTable

**Objective:** Create a new Sentry Projects admin page using the DataTable component from `@magnet-cms/ui/components`.

**Dependencies:** Task 2

**Files:**

- Create: `packages/plugins/sentry/src/admin/pages/sentry-projects.tsx`

**Key Decisions / Notes:**

- Import `DataTable`, `DataTableColumn`, `Badge`, `Skeleton` from `@magnet-cms/ui/components`
- Import `PageContent`, `PageHeader`, `useAdapter` from `@magnet-cms/admin`
- Define `SentryProject` interface matching backend response
- Columns:
  - **Name** (type: `text`, accessorKey: `name`) — project display name
  - **Slug** (type: `code`, accessorKey: `slug`) — project slug in monospace
  - **Platform** (type: `custom`) — show platform with fallback to "—" if null
  - **Errors (24h)** (type: `custom`) — show `errorCount` number or "—" if null
  - **Active** (type: `custom`) — Badge showing "Current" (variant: default) for active project, empty for others
- Follow the same page structure as `sentry-issues.tsx`: `PageHeader` + `PageContent`, `useAdapter().request()`, loading skeleton, empty state
- Handle the case where scope probing shows `projectRead: false` — display a message that the token lacks `project:read` scope

**Definition of Done:**

- [ ] Projects page renders DataTable with Name, Slug, Platform, Errors (24h), Active columns
- [ ] Active project shows "Current" badge
- [ ] Loading state shows skeleton
- [ ] Empty state shows "No projects found" message
- [ ] Missing scope shows appropriate message
- [ ] No TypeScript errors

**Verify:**

- `cd packages/plugins/sentry && bun run build`

---

### Task 4: Route and Sidebar Registration

**Objective:** Register the new Projects page in both the backend plugin decorator and frontend manifest, add sidebar entry.

**Dependencies:** Task 3

**Files:**

- Modify: `packages/plugins/sentry/src/backend/plugin.ts`
- Modify: `packages/plugins/sentry/src/admin/index.ts`

**Key Decisions / Notes:**

- Add route child: `{ path: 'projects', componentId: 'SentryProjects' }` — add after `issues` in the children array
- Add sidebar item: `{ id: 'sentry-projects', title: 'Projects', url: '/sentry/projects', icon: 'FolderKanban' }` — add between Issues and Settings
- Add component import: `SentryProjects: () => import('./pages/sentry-projects')` in the components map
- Both `plugin.ts` and `admin/index.ts` must be updated (they mirror each other — `plugin.ts` for backend SSR metadata, `admin/index.ts` for frontend runtime)

**Definition of Done:**

- [ ] Projects route is registered in both plugin.ts and admin/index.ts
- [ ] Sidebar shows Projects entry between Issues and Settings
- [ ] Lazy component import registered for SentryProjects
- [ ] Frontend bundle builds successfully

**Verify:**

- `cd packages/plugins/sentry && bun run build`

---

### Task 5: Enhanced Settings Page with Scope Display

**Objective:** Add a "Token Scopes" card to the Settings page that shows which API permissions the configured token has.

**Dependencies:** Task 2

**Files:**

- Modify: `packages/plugins/sentry/src/admin/pages/sentry-settings.tsx`

**Key Decisions / Notes:**

- Fetch scopes from `GET /sentry/admin/scopes` in the existing `useEffect` (add to the `Promise.all`)
- Add `SentryTokenScopes` interface matching backend type
- New Card after "API Connection" card: "Token Scopes" showing each scope with a colored badge (green = available, gray = not available)
- Display scope names in user-friendly format: `org:read` → "Organization Read", `project:read` → "Project Read", etc.
- Only show the scopes card when API is connected (when `apiStatus?.connected` is true)

**Definition of Done:**

- [ ] Settings page shows "Token Scopes" card when API is connected
- [ ] Each scope shows green badge (available) or gray badge (unavailable)
- [ ] Scope card doesn't render when API is not connected
- [ ] No TypeScript errors
- [ ] Frontend bundle builds successfully

**Verify:**

- `cd packages/plugins/sentry && bun run build`

## Open Questions

None — all design decisions resolved.
