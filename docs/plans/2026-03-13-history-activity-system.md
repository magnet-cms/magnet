# History & Activity System Implementation Plan

Created: 2026-03-13
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add comprehensive activity logging for audit trails and version comparison for the history system, full stack (backend + admin UI).

**Architecture:** New `ActivityModule` with schema, service, controller, and settings. Activity records are created by `@OnEvent` handlers reacting to events emitted by existing modules (auth, RBAC) and newly-added event emission in `ContentService`. Version comparison uses flat field-level diff in `HistoryService`. Admin UI gets a dedicated `/activity` page, real data in dashboard feed, and a version diff side panel.

**Tech Stack:** NestJS (backend), React + React Query (admin UI), existing EventService + `@OnEvent` decorator pattern.

## Scope

### In Scope
- Activity schema, module, service, controller, settings
- Event emission from ContentService (currently missing)
- @OnEvent handlers in ActivityService to persist activity records
- Version comparison (flat field-level diff) in HistoryService
- Admin API adapter types + HTTP adapter for activity & version comparison
- Dashboard activity feed connected to real API
- Dedicated /activity page with filtering, search, pagination
- Version comparison side panel in SchemaFormPage

### Out of Scope
- Deep recursive diff for nested objects/arrays
- Approval workflow implementation (setting exists but not implemented)
- Real-time activity feed (WebSocket/SSE)
- Activity log export (CSV/JSON)
- Version comments/threading

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - **Module pattern:** See `packages/core/src/modules/history/history.module.ts` — uses `forwardRef(() => DatabaseModule)`, `DatabaseModule.forFeature(Schema)`, `SettingsModule.forFeature(Settings)`, model injection via `ModuleRef` with `HISTORY_MODEL` token
  - **Event emission:** See `packages/core/src/modules/auth/auth.service.ts:780-793` — `emitEvent()` helper wraps `eventService.emit()` with try/catch so failures don't break main operations
  - **@OnEvent handlers:** See `packages/core/src/modules/events/event-handler-discovery.service.ts` — decorated methods are auto-discovered on module init. Example in event module JSDoc: `@OnEvent('content.created', { priority: 10 })`
  - **Settings:** See `packages/core/src/modules/content/content.settings.ts` — uses `@Settings({ group, label, icon, order, sections })` + `@SettingField.*` decorators
  - **Schema:** See `packages/core/src/modules/history/schemas/history.schema.ts` — uses `@Schema({ versioning: false, i18n: false })` + `@Field.*` decorators
  - **Admin adapter:** See `packages/client/admin/src/core/adapters/types.ts:175-333` — `MagnetApiAdapter` interface, each domain is a section (auth, content, settings, history, media)
  - **Admin hooks:** See `packages/client/admin/src/hooks/useSchema.ts` — React Query hooks with key factories

- **Conventions:**
  - Biome for linting/formatting (`bun run lint`)
  - TypeScript strict mode, NO `any` or type assertions
  - Conventional commits
  - `bun run check-types` before marking complete

- **Key files:**
  - `packages/core/src/magnet.module.ts` — root module, imports all modules
  - `packages/core/src/modules/events/event.service.ts` — EventService (global, no import needed)
  - `packages/core/src/modules/events/event-context.interceptor.ts` — `getEventContext()` for request context
  - `packages/common/src/types/events.types.ts` — all event names and payload types
  - `packages/client/admin/src/features/dashboard/components/DashboardHome.tsx:72-85` — placeholder activities to replace
  - `packages/client/admin/src/features/settings/components/ActivityLogsPanel.tsx` — mock data to replace
  - `packages/client/admin/src/core/adapters/http-adapter.ts` — HTTP adapter implementation

- **Gotchas:**
  - `EventContextInterceptor` is exported but NOT globally registered — it's available for consumer apps. `getEventContext()` may return `undefined` outside HTTP context
  - `EventsModule` is `@Global()` so `EventService` is injectable everywhere without importing
  - History module uses a `setTimeout(resolve, 1000)` hack in model factory — follow same pattern for Activity model to avoid race conditions with DB initialization
  - Content module's `getModel()` uses discovery service for schema name resolution — activity should NOT do this (it has its own fixed schema)

- **Domain context:**
  - Activity = audit log record of a user action (create, update, delete, publish, login, etc.)
  - Version = snapshot of document data at a point in time (managed by HistoryService)
  - Version comparison = flat diff of two version snapshots showing which fields changed

## Runtime Environment

- **Start command:** `bun run dev` (starts all packages)
- **API Port:** 3000 (NestJS backend)
- **Admin Port:** 5173 (Vite dev server)
- **Health check:** `GET /health`

## Assumptions

- The event system (Plan 000b) is fully functional and events are dispatched reliably — Tasks 3, 4 depend on this
- The `Model<T>` interface supports `create()`, `findMany()`, `findOne()`, `delete()`, `query()` — Task 1 depends on this (confirmed by History model usage)
- Admin UI routing via react-router-dom with existing sidebar navigation pattern — Tasks 8, 9 depend on this
- `@Schema({ versioning: false, i18n: false })` disables versioning/i18n for internal schemas — Task 1 depends on this (confirmed by History schema)

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| High-volume activity writes impact performance | Medium | Medium | Use `{ async: true }` on @OnEvent handlers so logging never blocks requests. Add retention cleanup via settings. |
| ContentService event emission breaks existing behavior | Low | High | Wrap all emit calls in try/catch (same pattern as AuthService). Events fail silently. |
| Activity model DB initialization race condition | Medium | Medium | Use same `setTimeout` + `ModuleRef` pattern as HistoryModule for model injection |
| Admin UI bundle size increase from new page | Low | Low | Lazy-load ActivityPage route. Version diff drawer is already within existing page. |

## Goal Verification

### Truths
1. Creating/updating/deleting/publishing content creates corresponding activity records in the database
2. Login/logout events create activity records
3. GET /activity returns recent activities with pagination
4. GET /activity/entity/:type/:id returns activities for a specific entity
5. GET /history/compare/:v1/:v2 returns field-level diff between two versions
6. Admin dashboard shows real activity data (not placeholder)
7. Admin /activity page shows filterable, paginated activity log

### Artifacts
1. `packages/core/src/modules/activity/` — full module with schema, service, controller, settings
2. `packages/core/src/modules/content/content.service.ts` — event emission added
3. `packages/core/src/modules/history/history.service.ts` — `compareVersions()` added
4. `packages/client/admin/src/core/adapters/types.ts` — activity types in adapter interface
5. `packages/client/admin/src/features/activity/` — activity page components
6. `packages/client/admin/src/features/dashboard/components/DashboardHome.tsx` — real data

## Progress Tracking

- [x] Task 1: Activity Schema & Module (backend)
- [x] Task 2: Activity Settings
- [x] Task 3: Event Emission from ContentService
- [x] Task 4: Activity Event Handlers
- [x] Task 5: Version Comparison (backend)
- [x] Task 6: Admin API Adapter & Types
- [x] Task 7: Dashboard Activity Feed (UI)
- [x] Task 8: Activity Page (UI)
- [x] Task 9: Version Comparison UI

**Total Tasks:** 9 | **Completed:** 9 | **Remaining:** 0

## Implementation Tasks

### Task 1: Activity Schema & Module (Backend)

**Objective:** Create the Activity schema, service, controller, and module. Register in MagnetModule.
**Dependencies:** None

**Files:**
- Create: `packages/core/src/modules/activity/schemas/activity.schema.ts`
- Create: `packages/core/src/modules/activity/activity.service.ts`
- Create: `packages/core/src/modules/activity/activity.controller.ts`
- Create: `packages/core/src/modules/activity/activity.module.ts`
- Create: `packages/core/src/modules/activity/index.ts`
- Modify: `packages/core/src/magnet.module.ts`

**Key Decisions / Notes:**
- Schema uses `@Schema({ versioning: false, i18n: false })` — activity logs are not versioned or localized
- Follow HistoryModule's model injection pattern with `ACTIVITY_MODEL` token and `ModuleRef` + `setTimeout`
- ActivityService methods: `log()`, `getRecent()`, `getByEntity()`, `getByUser()`, `search()`, `cleanup()`
- Controller endpoints: `GET /activity` (recent), `GET /activity/entity/:type/:id`, `GET /activity/user/:userId`, `GET /activity/search`, `DELETE /activity/cleanup`
- All endpoints use `@RestrictedRoute()` and `@UseGuards(JwtAuthGuard)`
- Activity action types should mirror the canonical `EventName` union from `packages/common/src/types/events.types.ts`. Store the event name string directly (e.g., `'content.created'`, `'user.login'`, `'api_key.created'`, `'settings.updated'`). Do NOT invent custom action names — use the exact event name strings from EventName.

**Definition of Done:**
- [ ] Activity schema created with proper field decorators and indexes
- [ ] ActivityService has all CRUD + search + cleanup methods
- [ ] ActivityController exposes REST endpoints
- [ ] ActivityModule registered in MagnetModule imports
- [ ] `bun run check-types` passes

**Verify:**
- `bun run check-types`
- `curl http://localhost:3000/activity` returns empty array (no activities yet)

---

### Task 2: Activity Settings

**Objective:** Add configurable settings for activity logging (retention, logging level, IP tracking, field change tracking).
**Dependencies:** Task 1

**Files:**
- Create: `packages/core/src/modules/activity/activity.settings.ts`
- Modify: `packages/core/src/modules/activity/activity.module.ts`
- Modify: `packages/core/src/modules/activity/activity.service.ts`

**Key Decisions / Notes:**
- Follow `packages/core/src/modules/content/content.settings.ts` pattern with `@Settings` + `@SettingField.*`
- Settings: `enabled` (boolean), `retentionDays` (number, default 90), `logIpAddresses` (boolean), `logLevel` (select: minimal/standard/detailed), `trackFieldChanges` (boolean)
- Wire settings into ActivityService.log() — check `enabled` before persisting, check `logIpAddresses` before storing IP
- Register via `SettingsModule.forFeature(ActivitySettings)` in ActivityModule imports

**Definition of Done:**
- [ ] ActivitySettings class created with all fields
- [ ] Settings registered and appear in settings API
- [ ] ActivityService respects `enabled` setting
- [ ] `bun run check-types` passes

**Verify:**
- `bun run check-types`
- `curl http://localhost:3000/settings/activity` returns default settings

---

### Task 3: Event Emission from ContentService

**Objective:** Add event emission to all ContentService write operations so activity logging can react to content changes.
**Dependencies:** None

**Files:**
- Modify: `packages/core/src/modules/content/content.service.ts`
- Modify: `packages/core/src/modules/content/content.module.ts`

**Key Decisions / Notes:**
- Inject `EventService` into ContentService constructor (EventsModule is global, no module import needed)
- Add private `emitEvent()` helper method (same pattern as `packages/core/src/modules/auth/auth.service.ts:780-793`) — wraps in try/catch, logs warning on failure
- Emit events after successful operations: `create()` → `content.created`, `update()` → `content.updated`, `delete()` → `content.deleted`, `publish()` → `content.published`, `unpublish()` → `content.unpublished`, `restoreVersion()` → `content.version.restored`
- Use `getEventContext()` from `event-context.interceptor.ts` for request context (userId, ipAddress, requestId)
- Event payloads must match `ContentEventPayload` type from `packages/common/src/types/events.types.ts`

**Definition of Done:**
- [ ] EventService injected into ContentService
- [ ] All write operations emit appropriate events
- [ ] Events fail silently (try/catch wrapper)
- [ ] `bun run check-types` passes

**Verify:**
- `bun run check-types`

---

### Task 4: Activity Event Handlers

**Objective:** Add `@OnEvent` handlers to ActivityService that listen to content, auth, and settings events and persist them as activity records.
**Dependencies:** Task 1, Task 3

**Files:**
- Modify: `packages/core/src/modules/activity/activity.service.ts`

**Key Decisions / Notes:**
- Use `@OnEvent('content.created', { async: true })` — async so logging never blocks the request
- Handle all content events: created, updated, deleted, published, unpublished, version.restored
- Handle auth events (already emitted by AuthService): user.login, user.logout, user.registered, user.password_changed
- Handle settings events: settings.updated, settings.group_updated
- Handle api_key events (already emitted by ApiKeysService): api_key.created, api_key.revoked, api_key.used — map `ApiKeyEventPayload` fields to `entityType: 'api_key'`, `entityId: payload.apiKeyId`, `entityName: payload.name`
- **IMPORTANT:** All event name strings MUST match exactly from `packages/common/src/types/events.types.ts` EventPayloadMap. Cross-reference that file before implementing any @OnEvent handler.
- Map event payloads to Activity records: extract `entityType`, `entityId`, `action`, `userId` from payload
- For content.updated, include `changes` field if `trackFieldChanges` setting is enabled (changes come from event payload's `FieldChange[]`)
- Check `enabled` setting before persisting (from Task 2)

**Definition of Done:**
- [ ] @OnEvent handlers registered for content, auth, settings, and api_key events
- [ ] All handlers use `{ async: true }` to avoid blocking
- [ ] Activity records created with proper entity type, ID, action, user info
- [ ] Settings respected (enabled, logIpAddresses, trackFieldChanges)
- [ ] `bun run check-types` passes

**Verify:**
- `bun run check-types`
- Create content via API → `GET /activity` shows the activity record

---

### Task 5: Version Comparison (Backend)

**Objective:** Add flat field-level version comparison to HistoryService with a new API endpoint.
**Dependencies:** None

**Files:**
- Modify: `packages/core/src/modules/history/history.service.ts`
- Modify: `packages/core/src/modules/history/history.controller.ts`
- Create: `packages/core/src/modules/history/dto/version-diff.dto.ts`

**Key Decisions / Notes:**
- Add `compareVersions(versionId1: string, versionId2: string)` to HistoryService
- Add private `computeDiff(before: Record<string, unknown>, after: Record<string, unknown>)` method
- Flat field-level diff only — compare top-level fields using deep equality (JSON.stringify comparison for objects/arrays)
- Return `VersionDiff` type: `{ version1: VersionSummary, version2: VersionSummary, changes: FieldChange[] }`
- `FieldChange`: `{ field: string, before: unknown, after: unknown, type: 'added' | 'removed' | 'modified' }`
- New endpoint: `GET /history/compare/:versionId1/:versionId2`
- Throw `NotFoundException` if either version doesn't exist

**Definition of Done:**
- [ ] compareVersions() returns correct field-level diff
- [ ] DTO types exported for frontend use
- [ ] New endpoint accessible and returns proper diff
- [ ] `bun run check-types` passes

**Verify:**
- `bun run check-types`
- Create two versions of same document, call compare endpoint → returns diff

---

### Task 6: Admin API Adapter & Types

**Objective:** Add activity and version comparison types to the admin API adapter interface and HTTP adapter implementation.
**Dependencies:** Task 1 (API endpoints), Task 5 (compare endpoint)

**Files:**
- Modify: `packages/client/admin/src/core/adapters/types.ts`
- Modify: `packages/client/admin/src/core/adapters/http-adapter.ts`
- Create: `packages/client/admin/src/hooks/useActivity.ts`

**Key Decisions / Notes:**
- Add `Activity` type to adapter types matching backend schema
- Add `activity` section to `MagnetApiAdapter` interface: `getRecent()`, `getByEntity()`, `search()`, `cleanup()`
- Add `compareVersions()` to existing `history` section
- Implement in HTTP adapter
- Create `useActivity` hooks: `useRecentActivity(limit?)`, `useEntityActivity(type, id)`, `useActivitySearch(query)`, `useVersionComparison(v1, v2)`
- Follow existing hook patterns in `packages/client/admin/src/hooks/useSchema.ts`

**Definition of Done:**
- [ ] Activity types added to adapter types
- [ ] MagnetApiAdapter interface updated with activity section
- [ ] HTTP adapter implements all activity methods
- [ ] React Query hooks created with proper key factories
- [ ] compareVersions added to history adapter section
- [ ] `bun run check-types` passes

**Verify:**
- `bun run check-types`

---

### Task 7: Dashboard Activity Feed (UI)

**Objective:** Connect the dashboard ActivityFeed component to real API data, replacing placeholder activities.
**Dependencies:** Task 6

**Files:**
- Modify: `packages/client/admin/src/features/dashboard/components/DashboardHome.tsx`

**Key Decisions / Notes:**
- Replace `placeholderActivities` with `useRecentActivity(5)` hook
- Map activity records to the existing `Activity` interface expected by `ActivityFeed` component (icon, message, timestamp)
- Map action types to appropriate icons (e.g., content.create → Plus, content.delete → Trash, user.login → LogIn)
- Handle loading state with Skeleton
- `onViewAll` navigates to `/activity` (from Task 8)
- Format timestamps as relative time ("2 minutes ago", "1 hour ago")

**Definition of Done:**
- [ ] Dashboard shows real activity data from API
- [ ] Activity items have appropriate icons per action type
- [ ] Loading skeleton shown while fetching
- [ ] Empty state shown when no activities
- [ ] "View all" link navigates to /activity
- [ ] `bun run check-types` passes

**Verify:**
- `bun run check-types`
- `bun run dev:admin` — dashboard shows real activities

---

### Task 8: Activity Page (UI)

**Objective:** Create a dedicated /activity route with filterable, paginated activity log.
**Dependencies:** Task 6, Task 7

**Files:**
- Create: `packages/client/admin/src/features/activity/components/ActivityPage.tsx`
- Create: `packages/client/admin/src/features/activity/index.ts`
- Modify: `packages/client/admin/src/routes/index.tsx`
- Modify: `packages/client/admin/src/layouts/DashboardLayout/AppSidebar.tsx`

**Key Decisions / Notes:**
- Add `/activity` route with lazy loading
- Add "Activity" item to sidebar navigation (use `Activity` icon from lucide-react)
- ActivityPage layout: header with title, filter bar (entity type dropdown, date range, action type), paginated list
- Use `useActivitySearch()` hook with filter state
- Reuse existing UI components from `@magnet-cms/ui` (Card, Button, Select, etc.)
- Pagination: simple "Load more" or offset-based with page numbers
- Each activity item shows: action icon, description, user name, timestamp, link to entity

**Definition of Done:**
- [ ] /activity route accessible from sidebar
- [ ] Activity list displays with proper formatting
- [ ] Filters work (entity type, action type)
- [ ] Pagination works
- [ ] Clicking entity link navigates to the entity
- [ ] `bun run check-types` passes

**Verify:**
- `bun run check-types`
- `bun run dev:admin` — navigate to /activity, verify filtering works

---

### Task 9: Version Comparison UI

**Objective:** Add version comparison side panel to the SchemaFormPage version history.
**Dependencies:** Task 5, Task 6

**Files:**
- Create: `packages/client/admin/src/features/content-manager/components/VersionDiffDrawer.tsx`
- Modify: `packages/client/admin/src/features/content-manager/components/SchemaFormPage.tsx`

**Key Decisions / Notes:**
- Add a "Compare" button next to each version in the version history list
- Clicking "Compare" opens a drawer/side panel showing field-level diff between the selected version and the most recent version (latest by versionNumber)
- There is NO existing inline diff in SchemaFormPage — this is a new feature
- Use `useVersionComparison(v1, v2)` hook from Task 6
- Diff display: list of changed fields with before/after values, color-coded (green=added, red=removed, yellow=modified)
- Simple text representation of values (JSON.stringify for objects)
- Drawer component using existing UI library patterns (Sheet/Drawer from @magnet-cms/ui)

**Definition of Done:**
- [ ] "Compare" button appears in version history
- [ ] Clicking opens drawer with field-level diff
- [ ] Changes are color-coded by type (added/removed/modified)
- [ ] Loading and error states handled
- [ ] `bun run check-types` passes

**Verify:**
- `bun run check-types`
- `bun run dev:admin` — create two versions, click Compare, verify diff displays

## E2E Testing Note

E2E tests should be added for new endpoints and UI pages per project conventions (`apps/e2e/tests/api/activity.spec.ts`, `apps/e2e/tests/ui/activity.spec.ts`). These can be added as a follow-up task after the core implementation is stable, or incrementally within each task if scope allows.

## Deferred Ideas

- **Real-time activity feed** via WebSocket/SSE — would require additional infrastructure
- **Activity export** (CSV/JSON) — useful for compliance, can be added to ActivityController later
- **Deep recursive diff** — could enhance version comparison for complex nested content
- **Activity retention cron job** — currently cleanup is manual via admin endpoint, could be automated
- **Version comments/threading** — would require additional schema and UI
