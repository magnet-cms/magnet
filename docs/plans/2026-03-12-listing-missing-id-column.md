# Listing Table Missing ID Column Fix Plan

Created: 2026-03-12
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Bugfix

## Summary
**Symptom:** Content listing table does not show the ID column for user-created schemas.
**Trigger:** Navigate to any content listing page.
**Root Cause:** `packages/client/admin/src/features/content-manager/components/ContentManagerListingPage.tsx:114-171` — `generateColumns()` builds columns from schema properties but never adds an ID column. The `_id` field is filtered out by the `!p.name.startsWith('_')` check (line 119), and `documentId` is not explicitly included.

## Investigation
- `generateColumns()` takes schema properties, filters out `_`-prefixed fields, takes first 5 visible props, then appends Status and Updated columns
- `_id` is filtered out because it starts with `_`
- `documentId` is not in schema properties — it's a system field added by the content layer
- `getEntryId()` at line 176 already knows how to extract `documentId || _id || id` — the data is there, just not displayed
- The fix should prepend an ID column before the schema property columns

## Fix Approach
**Files:** `packages/client/admin/src/features/content-manager/components/ContentManagerListingPage.tsx`
**Strategy:** In `generateColumns()`, prepend an ID column that displays `documentId` (truncated for readability) before the schema property columns. Use `getEntryId()` helper already defined in the file.

## Progress
- [x] Task 1: Add ID column to listing table
- [x] Task 2: Verify
**Tasks:** 2 | **Done:** 2

## Tasks
### Task 1: Add ID column to listing table
**Objective:** Always show an ID column as the first column in the content listing table
**Files:** `packages/client/admin/src/features/content-manager/components/ContentManagerListingPage.tsx`
**TDD:** Skip (UI-only change, no testable logic) — add ID column at start of `generateColumns()` return value
**Verify:** `bun run check-types`

### Task 2: Verify
**Objective:** Full suite + quality checks
**Verify:** `bun run check-types && bun run lint`
