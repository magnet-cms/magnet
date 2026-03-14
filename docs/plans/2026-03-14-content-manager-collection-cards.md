# Content Manager Collection Cards Implementation Plan

Created: 2026-03-14
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add an index page at `/content-manager` that displays all available collections as cards (reusing the existing `CollectionCard` component from the dashboard) so users can select a collection to proceed to its listing page.

**Architecture:** Create a new `ContentManagerHomePage` component that uses `useSchemas()` to fetch all schemas and renders them as `CollectionCard` components in a responsive grid. Register it as the index route for the `content-manager` path in the router.

**Tech Stack:** React, react-router-dom, `@magnet-cms/ui` CollectionCard, `useSchemas()` hook

## Scope

### In Scope
- New `ContentManagerHomePage` component with collection cards grid
- Route registration at `/content-manager` (index route)
- Loading and empty states
- Export from content-manager feature index

### Out of Scope
- Search/filter for collections
- Stats summary or entry counts per collection
- Pagination (not needed — schema counts are typically low)
- Changes to dashboard collection cards section

## Context for Implementer

> The content-manager route currently has NO index page. It only has `:schema`, `:schema/:id`, etc. When users click "Content Manager" in the sidebar or the dashboard "View all" link, they navigate to `/content-manager` which renders nothing (just an `<Outlet />`).

- **Pattern to follow:** The dashboard (`DashboardHome.tsx:194-207`) already transforms schemas into `CollectionCard` props. The new page follows this same pattern but shows ALL schemas (no `.slice(0, 4)`).
- **CollectionCard import:** Import from `~/features/dashboard/components/CollectionCard` — this re-exports the base `@magnet-cms/ui` CollectionCard with react-router `Link` pre-configured.
- **Schema data:** `useSchemas()` from `~/hooks/useDiscovery` returns `string[]` of schema names. The sidebar filters out `'media'` — the new page should do the same.
- **Page layout pattern:** All pages use `<PageHeader>` from `~/features/shared` for the header section, then a scrollable content area. See `ContentManagerListingPage.tsx:1-50` for the pattern.
- **Schema name formatting:** Use `names()` from `@magnet-cms/utils` to convert schema key to display title (e.g., `medicalRecord` → `Medical Record`).
- **Gotchas:** The route at `routes/index.tsx:220-239` currently wraps content-manager children in `<Outlet />` with no index element. The index route must be added as a child with `path: ''`.
- **Route convention:** The codebase uses `path: ''` for index routes (see `access-control` at `routes/index.tsx:254`, `settings` at `routes/index.tsx:277`). Use `path: ''` — NOT `index: true` — for consistency.

## Runtime Environment

- **Start command:** `bun run dev:admin` (Vite dev server)
- **Port:** 5173 (Vite) — proxied through NestJS at localhost:3000/admin
- **Health check:** Navigate to `http://localhost:3000/admin/content-manager`

## Assumptions

- `useSchemas()` returns all registered schema names including `media` — supported by `AppSidebar.tsx:23-25` which filters it out — Task 1 depends on this
- The `CollectionCard` from dashboard can be imported cross-feature without circular dependencies — supported by it being a simple re-export of `@magnet-cms/ui` — Task 1 depends on this
- The `names()` utility produces proper title-case from schema keys — supported by `AppSidebar.tsx:28-29` using it the same way — Task 1 depends on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cross-feature import causes bundling issues | Low | Medium | CollectionCard is a thin wrapper; if issues arise, move to `~/features/shared` |

## Goal Verification

### Truths
1. Navigating to `/content-manager` renders a page with collection cards for each registered schema
2. Each card links to `/content-manager/{schemaName}` and navigates correctly when clicked
3. The `media` schema is filtered out (it has a dedicated page)
4. Loading state shows skeleton placeholders while schemas load
5. Empty state shows a helpful message when no schemas exist

### Artifacts
- `packages/client/admin/src/features/content-manager/components/ContentManagerHomePage.tsx` — the new page component
- `packages/client/admin/src/routes/index.tsx` — updated with index route
- `packages/client/admin/src/features/content-manager/components/index.ts` — updated export
- `apps/e2e/tests/ui/content-manager-home.spec.ts` — E2E test

## Progress Tracking

- [x] Task 1: ContentManagerHomePage component
- [x] Task 2: Route registration and integration
- [x] Task 3: E2E test for content-manager index page

**Total Tasks:** 3 | **Completed:** 3 | **Remaining:** 0

## Implementation Tasks

### Task 1: ContentManagerHomePage Component

**Objective:** Create the main page component that renders all collections as cards in a responsive grid with loading and empty states.

**Dependencies:** None

**Files:**
- Create: `packages/client/admin/src/features/content-manager/components/ContentManagerHomePage.tsx`
- Modify: `packages/client/admin/src/features/content-manager/components/index.ts`

**Key Decisions / Notes:**
- Import `CollectionCard` from `~/features/dashboard/components/CollectionCard` (pre-configured with react-router Link)
- Use `useSchemas()` from `~/hooks/useDiscovery` to fetch schema list
- Filter out `'media'` schema (same filter as `AppSidebar.tsx:23-25`)
- Use `names()` from `@magnet-cms/utils` to format schema names for display
- Use `getSchemaIcon()` pattern from `DashboardHome.tsx:174-178` (returns `Box` icon by default)
- Follow `DashboardHome.tsx:194-207` for schema-to-card transformation — but show ALL schemas, not just first 4
- Each card links to `/content-manager/${schemaName}`
- Layout: `PageHeader` with title "Content Manager" + subtitle, then scrollable grid area with `bg-gray-50/50`
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6`
- Loading: 4 skeleton cards (matching dashboard pattern at `DashboardHome.tsx:291-295`)
- Empty: Centered message with Database icon + "No collections yet" (matching dashboard pattern at `DashboardHome.tsx:297-312`)

**Definition of Done:**
- [ ] Component renders all schemas as CollectionCard components
- [ ] Media schema is filtered out
- [ ] Loading state shows skeleton cards
- [ ] Empty state shows helpful message
- [ ] No diagnostics errors
- [ ] Exported from content-manager feature index

**Verify:**
- `bun run check-types`

### Task 2: Route Registration and Integration

**Objective:** Register ContentManagerHomePage as the index route for `/content-manager` so it renders when users navigate to that path.

**Dependencies:** Task 1

**Files:**
- Modify: `packages/client/admin/src/routes/index.tsx`

**Key Decisions / Notes:**
- Add index route to the `content-manager` children array at `routes/index.tsx:222`
- Pattern: `{ path: '', element: withSuspense(ContentManagerHomePageWrapper) }` — must be first child
- Import `ContentManagerHomePage` from `~/features/content-manager`
- Create a simple wrapper function (like `ContentManagerListingPageWrapper` at line 153) — though this page needs no params, a direct `withSuspense(ContentManagerHomePage)` element suffices
- The existing `<Outlet />` wrapper at line 221 already handles rendering children

**Definition of Done:**
- [ ] Navigating to `/content-manager` renders the ContentManagerHomePage
- [ ] Navigating to `/content-manager/:schema` still works as before
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`

### Task 3: E2E Test for Content-Manager Index Page

**Objective:** Add an E2E test that verifies the content-manager index page renders collection cards and navigation works.

**Dependencies:** Task 1, Task 2

**Files:**
- Create: `apps/e2e/tests/ui/content-manager-home.spec.ts`

**Key Decisions / Notes:**
- Use Playwright `ui` project (follows convention from `magnet-conventions.md`)
- Test: navigate to `/admin/content-manager`, assert collection cards are visible
- Test: click a card, assert navigation to `/admin/content-manager/{schemaName}`
- Use existing auth fixture pattern from `apps/e2e/src/fixtures/auth.fixture.ts`

**Definition of Done:**
- [ ] E2E test navigates to `/content-manager` and verifies cards render
- [ ] E2E test clicks a card and verifies navigation
- [ ] Test passes with `bun run test:e2e --project=ui`

**Verify:**
- `bun run test:e2e --project=ui`

## Open Questions

None — all decisions resolved.
