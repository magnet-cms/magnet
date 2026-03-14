# Activity Page Redesign Implementation Plan

Created: 2026-03-13
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary
**Goal:** Redesign the Activity page to reuse the DataTable component (same as Content Manager/Users pages), replace the user ID text input with a user dropdown, and fix the stray "0" character.
**Architecture:** Rewrite `ActivityPage.tsx` to follow the established `DataTable` + `variant="content-manager"` pattern used by `UsersListingPage` and `ContentManagerListingPage`. Add `useUserList` import for user dropdown population.
**Tech Stack:** React, @tanstack/react-table (via DataTable), @magnet-cms/ui

## Scope
### In Scope
- Rewrite ActivityPage to use DataTable with `content-manager` variant
- 4 columns: Action, Entity, User, Timestamp
- Replace User ID text input with a Select dropdown populated from `useUserList` (+ "System" option)
- Keep Action Type and Entity Type filter dropdowns in a toolbar (same pattern as Content Manager toolbar)
- Fix the "0" character bug (operator precedence in `hasMore` — goes away with DataTable pagination)
- Read-only listing — no row actions

### Out of Scope
- Activity detail/expand view
- Export/download functionality
- Date range filtering UI

## Context for Implementer
> Write for an implementer who has never seen the codebase.

- **Pattern to follow:** `packages/client/admin/src/features/users/components/UsersListingPage.tsx` — this is the canonical example of a listing page using `DataTable` with `variant="content-manager"`, custom toolbar, and custom pagination. Follow its layout structure exactly.
- **DataTable component:** `@magnet-cms/ui` exports `DataTable`, `DataTableColumn`, `DataTableRenderContext`. Use `variant="content-manager"` for the same look as Content Manager.
- **Column types available:** `text` (with optional `format`), `badge`, `status`, `custom`, `number`, `selector`, `link` — see `packages/client/ui/src/components/organisms/data-table/types.ts`
- **User list hook:** `useUserList(page, limit)` from `~/hooks/useUsers` returns a react-query result. Destructure as `const { data: usersData, isLoading: isUsersLoading } = useUserList(1, 100)` and access the user array as `usersData?.users ?? []`. The `UserListResponse` type has `{ users: User[], total: number, page: number, limit: number }`.
- **Activity data hook:** `useActivitySearch` from `~/hooks/useActivity` returns `{ data: PaginatedActivities, isLoading }` where `PaginatedActivities = { items: ActivityRecord[], total, limit, offset }`.
- **ActivityRecord fields:** `id`, `action`, `entityType`, `entityId?`, `entityName?`, `userId`, `userName?`, `metadata?`, `changes?`, `ipAddress?`, `userAgent?`, `timestamp`
- **Filter selects:** Use `'all'` as sentinel value (never empty string — Radix UI Select.Item throws on empty string values). Already fixed in the previous bugfix.
- **"0" character bug:** `ActivityPage.tsx:126-128` — `hasMore` evaluates to `0` (number) when `data.total` is 0, and `{0 && <JSX>}` renders "0" in React. This goes away entirely when we switch to DataTable's built-in pagination.
- **Gotcha:** The DataTable component handles its own pagination state internally — don't try to implement manual offset/load-more accumulation. Just pass all fetched items to `data` prop.
- **Key files:**
  - `packages/client/admin/src/features/activity/components/ActivityPage.tsx` — the file to rewrite
  - `packages/client/admin/src/features/users/components/UsersListingPage.tsx:108-484` — pattern to follow
  - `packages/client/admin/src/features/content-manager/components/ContentManagerListingPage.tsx:228-582` — alternative pattern reference
  - `packages/client/ui/src/components/organisms/data-table/data-table.tsx` — DataTable component
  - `packages/client/admin/src/hooks/useActivity.ts` — activity data hooks
  - `packages/client/admin/src/hooks/useUsers.ts` — user list hook
  - `packages/client/admin/src/core/adapters/types.ts:161-196` — ActivityRecord, ActivitySearchParams, PaginatedActivities types

## Assumptions
- `useUserList(1, 100)` will return all users for the dropdown (no project will have 100+ admin users) — Task 1 depends on this
- The `useActivitySearch` hook's server-side filtering works correctly for `userId`, `action`, `entityType` params — Task 1 depends on this
- DataTable's client-side pagination is sufficient for now — we fetch up to 500 records via `useActivitySearch({ limit: 500 })` and DataTable paginates over them. If more than 500 records are typical, server-side cursor pagination will be needed (deferred) — Task 1 depends on this.

## Goal Verification
### Truths
1. Activity page renders a DataTable with content-manager styling (same visual pattern as Users page)
2. Table has 4 columns: Action, Entity, User, Timestamp
3. User filter is a Select dropdown with all users + "All Users" + "System" options
4. Action Type and Entity Type filters work as before
5. No stray "0" character appears anywhere
6. Page has loading, empty, and error states matching the Users page pattern

### Artifacts
- `packages/client/admin/src/features/activity/components/ActivityPage.tsx` — rewritten component

## Progress Tracking
- [x] Task 1: Rewrite ActivityPage with DataTable
- [x] Task 2: Verify
**Total Tasks:** 2 | **Completed:** 2 | **Remaining:** 0

## Implementation Tasks

### Task 1: Rewrite ActivityPage with DataTable

**Objective:** Replace the custom list view with DataTable using the content-manager variant, add user dropdown filter, fix "0" bug.
**Dependencies:** None

**Files:**
- Modify: `packages/client/admin/src/features/activity/components/ActivityPage.tsx`

**Key Decisions / Notes:**
- Follow `UsersListingPage.tsx` layout structure: PageHeader with title → DataTable with renderToolbar + renderPagination
- 4 columns using DataTableColumn<ActivityRecord>:
  1. **Action** — `type: 'text'`, `accessorKey: 'action'`, format to show human-readable action with optional icon
  2. **Entity** — `type: 'custom'`, render `entityType` + `entityName` (or `entityId`) combined
  3. **User** — `type: 'text'`, `accessorKey: 'userName'`, format to show user name (fallback to userId)
  4. **Timestamp** — `type: 'text'`, `accessorKey: 'timestamp'`, format with relative time formatter
- Toolbar: Action Type Select, Entity Type Select, User Select (populated from useUserList), Clear Filters button
- User Select options: "All Users" (value: 'all') + "System" (value: 'system') + users from API mapped to `{ label: user.name, value: user.id }`
- Remove all manual pagination state (`allItems`, `handleLoadMore`, `hasMore`, offset accumulation). DataTable handles client-side pagination over the fetched data array.
- Use `useActivitySearch` with `limit: 500` to fetch a large batch of activity records. Pass `data.items` to DataTable `data` prop. DataTable will paginate client-side over these items.
- Server-side filtering via `useActivitySearch` params (action, entityType, userId) is used to filter at the API level. No additional client-side filtering needed.
- Include `contentManagerStyles` CSS string (same as UsersListingPage)
- Remove unused imports (Activity icon for empty state can stay, Skeleton for loading)

**Definition of Done:**
- [ ] DataTable renders with content-manager variant
- [ ] 4 columns display correctly
- [ ] User filter is a dropdown with all users + System
- [ ] Action and Entity Type filters work
- [ ] No "0" character appears
- [ ] Loading/empty states match Users page pattern
- [ ] TypeScript compiles without errors
- [ ] Biome lint passes

**Verify:**
- `cd packages/client/admin && npx tsc --noEmit`
- `bunx biome check packages/client/admin/src/features/activity/components/ActivityPage.tsx`

### Task 2: Verify

**Objective:** Full type check + lint + build verification
**Dependencies:** Task 1

**Definition of Done:**
- [ ] Type check passes across admin and core packages
- [ ] Lint passes on changed files
- [ ] Core package builds successfully

**Verify:**
- `cd packages/client/admin && npx tsc --noEmit`
- `cd packages/core && npx tsc --noEmit && bun run build`
