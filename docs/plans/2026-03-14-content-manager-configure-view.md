# Content Manager Configure View Implementation Plan

Created: 2026-03-14
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary
**Goal:** Wire the Configure button in the content manager listing page to open a slide-over drawer where users can toggle column visibility, reorder columns via drag-and-drop, and set display preferences (page size, default sort).
**Architecture:** A `ConfigureViewDrawer` component using the existing `Sheet` from `@magnet-cms/ui`. A `useViewConfig` hook manages state with localStorage for instant reads and a backend API for cross-device persistence. The backend stores per-user view configs in a new `ViewConfig` collection via the existing database adapter pattern.
**Tech Stack:** React (Sheet, Switch, DnD Kit), TanStack Table (VisibilityState), NestJS (controller + service), Mongoose adapter.

## Scope
### In Scope
- ConfigureViewDrawer component (Sheet, right side)
- Column visibility toggles (Switch per schema property)
- Column reorder via drag-and-drop (DnD Kit — already in project)
- Display settings: default page size selector, default sort field + direction
- Persistence: localStorage (fast) + backend API (cross-device sync)
- Backend: `GET/PUT /user-preferences/view-config/:schema` endpoints
- ViewConfig schema + service in core

### Out of Scope
- Schema field configuration (labels, validation rules)
- Column width customization
- Per-role configuration presets
- Export/import of configurations

## Context for Implementer
> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - Sheet drawer usage: `packages/client/admin/src/features/media-library/components/MediaViewDrawer.tsx:102-103` — `<Sheet open={} onOpenChange={}>` → `<SheetContent side="right">` → `<SheetHeader>` + body + `<SheetFooter>`
  - DnD Kit column reorder: `packages/client/ui/src/components/organisms/data-table/hooks/use-drag-and-drop.ts` — existing DnD kit usage for row drag in DataTable
  - DataTable column visibility: `packages/client/ui/src/components/organisms/data-table/data-table.tsx:45-50` — `enableColumnVisibility`, `initialColumnVisibility` props, `VisibilityState` from TanStack
  - Schema property iteration: `ContentManagerListingPage.tsx:133-213` — `generateColumns()` uses `SchemaProperty[]` from `useSchema()`
  - Backend module pattern: `packages/core/src/modules/user/user.module.ts` — `DatabaseModule.forFeature(Schema)`, `@InjectModel`, plain provider

- **Conventions:**
  - Admin features live in `packages/client/admin/src/features/<feature>/`
  - Components in `components/`, hooks in parent feature or `~/hooks/`
  - Backend modules in `packages/core/src/modules/<module>/`
  - All schemas use `@Schema`, `@Field`, `@Prop` from `@magnet-cms/common`

- **Key files:**
  - `packages/client/admin/src/features/content-manager/components/ContentManagerListingPage.tsx` — the page with the Configure button (line 496-504, currently `console.log`)
  - `packages/client/ui/src/components/atoms/sheet.tsx` — Sheet component
  - `packages/client/ui/src/components/atoms/switch.tsx` — Switch toggle
  - `packages/client/admin/src/hooks/useSchema.ts` — `useSchema()` hook returning schema metadata
  - `packages/core/src/modules/user/user.service.ts` — example of `@InjectModel` usage

- **Gotchas:**
  - DataTable columns are dynamically generated from schema properties — the column ID must match property names for visibility toggling to work
  - `VisibilityState` is `Record<string, boolean>` — column ID → visible
  - DnD Kit is already a dependency (used by DataTable rows) — no install needed
  - The `ContentManagerListingPage` receives `schema` as prop — use it as the localStorage/API key
  - MagnetLogger is globally provided — inject without importing LoggingModule

- **Domain context:**
  - Each content type (Blog, Page, etc.) has its own schema with properties
  - The listing page dynamically generates columns from `schemaMetadata.properties`
  - Currently hardcoded to show first 5 properties — configure view should let users choose which

## Runtime Environment
- **Start command:** `bun run dev` (starts all services)
- **Port:** 3000 (backend + admin)
- **Health check:** `GET /health`

## Assumptions
- DnD Kit is available as a project dependency — supported by `package.json` of `@magnet-cms/ui` using `@dnd-kit/core`
- The `Sheet` component supports `side="right"` — confirmed in `sheet.tsx:44-57`
- `useSchema()` returns `SchemaProperty[]` including all fields — confirmed in `ContentManagerListingPage.tsx:237`
- User authentication provides a user ID for per-user view configs — confirmed by existing auth system (`/auth/me`)
- Column IDs in DataTable can be mapped to property names — Tasks 3-4 depend on this

## Risks and Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Column ID mismatch between generated columns and visibility state | Medium | High | Use `prop.name` as column ID in `generateColumns()` and in visibility state |
| DnD performance with many columns | Low | Low | Schema properties are typically <20, well within DnD limits |
| localStorage and API going out of sync | Medium | Medium | Use `updatedAt` timestamp for merge; localStorage is source of truth for current session; API syncs on load and save |
| ViewConfigModule DI failure on registration | Medium | High | Follow `forwardRef()` pattern from ActivityModule/HistoryModule; run app startup + `/health` check as first verification in Task 1 |

## Goal Verification
### Truths
1. Clicking "Configure View" opens a right-side drawer
2. Each schema property appears as a toggleable row in the drawer
3. Toggling a column off hides it from the DataTable
4. Dragging a column row reorders it in the table
5. Page size selection persists across page reloads
6. Configuration persists across browser sessions (localStorage) and devices (API)

### Artifacts
- `ConfigureViewDrawer.tsx` — the drawer component
- `useViewConfig.ts` — hook for loading/saving config
- `ViewConfigController` + `ViewConfigService` — backend API
- `view-config.schema.ts` — database schema
- `content-manager-configure-view.spec.ts` — E2E tests

## Progress Tracking
- [x] Task 1: Backend — ViewConfig schema, service, and controller
- [x] Task 2: Frontend — useViewConfig hook with localStorage + API sync
- [x] Task 3: Frontend — ConfigureViewDrawer component
- [x] Task 4: Frontend — Wire drawer into ContentManagerListingPage
- [x] Task 5: Verify
- [x] Task 6: E2E — Configure view drawer tests
**Total Tasks:** 6 | **Completed:** 6 | **Remaining:** 0

## Implementation Tasks

### Task 1: Backend — ViewConfig schema, service, and controller
**Objective:** Create a backend module for storing per-user, per-schema view configurations.
**Dependencies:** None

**Files:**
- Create: `packages/core/src/modules/view-config/schemas/view-config.schema.ts`
- Create: `packages/core/src/modules/view-config/view-config.service.ts`
- Create: `packages/core/src/modules/view-config/view-config.controller.ts`
- Create: `packages/core/src/modules/view-config/view-config.module.ts`
- Create: `packages/core/src/modules/view-config/index.ts`
- Modify: `packages/core/src/magnet.module.ts` — import ViewConfigModule

**Key Decisions / Notes:**
- Schema: `ViewConfig { userId: string, schemaName: string, columns: { name: string, visible: boolean, order: number }[], pageSize: number, sortField?: string, sortDirection?: 'asc' | 'desc', updatedAt: Date }`
- The `updatedAt` field is set server-side on every PUT — used by the frontend hook to determine whether API data is newer than localStorage
- Use `@Schema({ versioning: false, i18n: false, visible: false })` like Activity schema
- Controller: `GET /user-preferences/view-config/:schema` (returns config or default), `PUT /user-preferences/view-config/:schema` (upserts)
- Both endpoints protected by `@UseGuards(JwtAuthGuard)`, get userId via `@Req() req: AuthenticatedRequest` → `req.user.id` — this is the canonical pattern used across the codebase (see `packages/core/src/modules/rbac/rbac.controller.ts:247-250` and `packages/core/src/modules/auth/auth.controller.ts:116-118`). Define a local `interface AuthenticatedRequest extends Request { user: { id: string } }` in the controller file.
- Follow the `UserModule` / `UserService` pattern for `@InjectModel`

**Definition of Done:**
- [ ] Schema registered in database (includes `updatedAt` field)
- [ ] GET endpoint returns default config (all visible, schema order) when no saved config exists
- [ ] PUT endpoint upserts config for the current user + schema, sets `updatedAt` server-side
- [ ] Both endpoints require authentication (401 without token)
- [ ] App starts successfully after ViewConfigModule registration (`GET /health` returns 200)

**Verify:**
- `bun run check-types` (core package)
- Start mongoose-example app and confirm `/health` returns 200

### Task 2: Frontend — useViewConfig hook
**Objective:** Create a React hook that manages view configuration with localStorage cache and API sync.
**Dependencies:** Task 1

**Files:**
- Create: `packages/client/admin/src/features/content-manager/hooks/useViewConfig.ts`

**Key Decisions / Notes:**
- `useViewConfig(schema: string)` returns `{ config, updateConfig, isLoading, configVersion }`
- `configVersion` is a counter that increments on every `updateConfig()` call — used by Task 4 as a React `key` to force DataTable remount
- On mount: load from localStorage first (instant), then fetch from API
- Merge strategy: compare `updatedAt` timestamps — if API config has a newer `updatedAt` than localStorage, overwrite localStorage with API data. If localStorage is newer (user saved while offline), keep localStorage and background-sync to API.
- On save: write to localStorage immediately (with current `Date` as local `updatedAt`), then PUT to API in background. Increment `configVersion`.
- localStorage key: `magnet:view-config:${schema}`
- Config shape: `{ columns: { name: string, visible: boolean, order: number }[], pageSize: number, sortField?: string, sortDirection?: 'asc' | 'desc', updatedAt: string }`
- Use existing API client pattern from `~/hooks/useSchema.ts`

**Definition of Done:**
- [ ] Hook loads config from localStorage instantly
- [ ] Hook fetches from API on mount and uses `updatedAt` to determine which data is newer
- [ ] `updateConfig()` saves to both localStorage and API, increments `configVersion`
- [ ] TypeScript types are clean (no any)

**Verify:**
- `bun run check-types` (admin package)

### Task 3: Frontend — ConfigureViewDrawer component
**Objective:** Build the slide-over drawer with column toggles, drag-and-drop reorder, and display settings.
**Dependencies:** Task 2

**Files:**
- Create: `packages/client/admin/src/features/content-manager/components/ConfigureViewDrawer.tsx`

**Key Decisions / Notes:**
- Uses `Sheet` + `SheetContent` (side="right") + `SheetHeader` + `SheetFooter`
- Column visibility section: list of schema properties, each with a `Switch` toggle
- Column reorder: wrap list in DnD Kit `SortableContext`, each row is a draggable item with grip handle
- Display settings section: page size select (5, 10, 20, 30, 50), default sort field + direction
- "Reset to Defaults" button restores all visible, schema order, default page size
- "Apply" button saves via `updateConfig()` from `useViewConfig`
- Props: `open: boolean, onOpenChange: (open: boolean) => void, schema: string, properties: SchemaProperty[], config: ViewConfig, onSave: (config: ViewConfig) => void`

**Definition of Done:**
- [ ] Drawer opens/closes smoothly from right side
- [ ] All schema properties listed with toggle switches
- [ ] Columns reorderable via drag-and-drop
- [ ] Page size and sort settings configurable
- [ ] Reset button works
- [ ] Apply button calls onSave

**Verify:**
- `bun run check-types && bunx biome check packages/client/admin/src/features/content-manager/`

### Task 4: Frontend — Wire into ContentManagerListingPage
**Objective:** Connect the ConfigureViewDrawer to the listing page, applying config to DataTable.
**Dependencies:** Task 2, Task 3

**Files:**
- Modify: `packages/client/admin/src/features/content-manager/components/ContentManagerListingPage.tsx`

**Key Decisions / Notes:**
- Add state: `const [configOpen, setConfigOpen] = useState(false)`
- Wire button: `onClick={() => setConfigOpen(true)}` (replace `console.log`)
- Use `useViewConfig(schema)` to get/set config
- Modify `generateColumns()` to accept config: filter by `col.visible`, sort by `col.order`
- Pass `initialColumnVisibility` and `initialPagination` from config to DataTable
- **DataTable remount on config change:** `useDataTableState` initializes `columnVisibility` with `React.useState(initialColumnVisibility ?? {})` — this is a one-time init that ignores prop changes after mount. To apply new visibility settings, pass `key={configVersion}` (from `useViewConfig`) to `<DataTable>`. This forces React to unmount/remount the DataTable when config changes, reinitializing state from the new props. This is the simplest approach that doesn't require modifying the DataTable component.
- Render `<ConfigureViewDrawer>` after DataTable

**Definition of Done:**
- [ ] Configure button opens the drawer
- [ ] Column visibility changes are reflected in the table
- [ ] Column order changes are reflected in the table
- [ ] Page size preference applies
- [ ] Configuration persists across page reloads

**Verify:**
- `bun run check-types && bunx biome check packages/client/admin/src/features/content-manager/`

### Task 5: Verify
**Objective:** Full quality checks and runtime verification.

**Definition of Done:**
- [ ] `bun run check-types` passes for core and admin
- [ ] `bunx biome check` passes for all changed files
- [ ] Configure drawer opens when button is clicked
- [ ] Column visibility toggles work
- [ ] Settings persist across reload

**Verify:**
- `bun run check-types && bun run lint`

### Task 6: E2E — Configure view drawer tests
**Objective:** Write E2E tests covering the configure view drawer user workflows.
**Dependencies:** Task 4

**Files:**
- Create: `apps/e2e/tests/ui/content-manager-configure-view.spec.ts`
- Create: `apps/e2e/src/page-objects/configure-view-drawer.ts` (page object helper for drawer interactions)

**Key Decisions / Notes:**
- Follow existing E2E patterns in `apps/e2e/tests/ui/`
- Use page object pattern for drawer interactions (open, toggle column, apply, close)
- Test against a known schema (e.g., the default Blog or Page content type)

**Definition of Done:**
- [ ] Test: Configure button opens the right-side drawer
- [ ] Test: Toggling a column off hides it from the DataTable
- [ ] Test: Configuration persists after page reload
- [ ] All E2E tests pass: `bun run test:e2e --project=ui`

**Verify:**
- `bun run test:e2e --project=ui`
