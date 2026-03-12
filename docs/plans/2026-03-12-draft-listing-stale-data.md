# Draft Listing Stale Data After Edit Fix Plan

Created: 2026-03-12
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Bugfix

## Summary
**Symptom:** After editing a draft entry (adding data without publishing) and navigating back to the listing, the fields appear empty — the listing doesn't refresh with the updated draft data.
**Trigger:** Create empty entry → go back → open draft to edit → add data → auto-save fires → navigate back to listing → stale empty data shown.
**Root Cause:** `packages/client/admin/src/features/content-manager/components/SchemaFormPage.tsx:257-280` — `autoSave.onSuccess` invalidates the item and locale status queries but NOT the list query (`CONTENT_KEYS.list(schema)`), so the listing page serves stale cached data after auto-save.

## Investigation
- `useAutoSave` calls `adapter.content.update()` directly, bypassing the `useContentUpdate` mutation hook
- `useContentUpdate.onSuccess` correctly invalidates both item AND list queries — but auto-save never uses it
- `autoSave.onSuccess` only invalidates `['content', 'localeStatuses', ...]` and `['content', 'item', ...]`
- Missing: `queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.list(schema) })` or equivalent
- The `useContentUpdate` mutation at `useSchema.ts:164-170` is the working example — it invalidates lists on every update

## Fix Approach
**Files:** `packages/client/admin/src/features/content-manager/components/SchemaFormPage.tsx`
**Strategy:** Add list query invalidation to the `autoSave.onSuccess` callback, matching the pattern used in `useContentUpdate.onSuccess`. Use `CONTENT_KEYS.lists()` to invalidate all list variants for the schema.
**Tests:** E2E test not practical for cache invalidation timing — verify manually + existing E2E suite for regression

## Progress
- [x] Task 1: Fix auto-save list cache invalidation
- [x] Task 2: Verify
**Tasks:** 2 | **Done:** 2

## Tasks
### Task 1: Fix auto-save list cache invalidation
**Objective:** After auto-save, invalidate the content list query so listing page shows fresh data
**Files:** `packages/client/admin/src/features/content-manager/components/SchemaFormPage.tsx`
**TDD:** Add `queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.lists() })` to `autoSave.onSuccess` callback → verify cache invalidation occurs
**Verify:** `bun run check-types`

### Task 2: Verify
**Objective:** Full suite + quality checks
**Verify:** `bun run test:e2e && bun run check-types && bun run lint`
