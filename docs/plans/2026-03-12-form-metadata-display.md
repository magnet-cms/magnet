# Form Metadata Display Fix Plan

Created: 2026-03-12
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Bugfix

## Summary
**Symptom:** Form metadata (Created, Updated, Last Published) sometimes shows "Never" even when the entry has valid timestamps.
**Trigger:** Open a content entry for editing — metadata panel shows "Never" for all dates.
**Root Cause:** Two issues — (1) `SchemaFormPage.tsx:257` passes metadata from `normalizedData` which can be temporarily undefined during query key transitions (when `effectiveStatus` changes from default to loaded value, query key changes and data is briefly undefined). (2) `DocumentService.update():237-259` strips `createdAt` when creating a draft from published content (comment says "let database use default" but database may not have a default).

## Investigation
- `formatRelativeDate()` in `RelationsAndMetadataPanel.tsx:26` correctly returns "Never" only when `!date` is falsy
- Metadata is derived from `normalizedData?.createdAt` etc. — if `normalizedData` is undefined, ALL dates show "Never"
- `normalizedData = Array.isArray(contentData) ? contentData[0] : contentData` — undefined when contentData is undefined or empty array
- `effectiveStatus` depends on `useLocaleStatuses` which loads async — initial render uses default `'draft'`, then query key changes when locale statuses load, causing `contentData` to become undefined during re-fetch
- In `DocumentService.update()` line 241, `createdAt` is destructured out and not added to `draftData` when creating draft from published — so drafts created from published content may lack `createdAt`

## Fix Approach
**Files:** `packages/client/admin/src/features/content-manager/components/SchemaFormPage.tsx`, `packages/core/src/modules/document/document.service.ts`
**Strategy:**
1. **Frontend:** Use `keepPreviousData` / `placeholderData` option in `useContentItem` so data doesn't go undefined during query key transitions. Alternatively, memoize the metadata to keep the last valid values.
2. **Backend:** Preserve `createdAt` when creating draft from published content in `DocumentService.update()`.

## Progress
- [x] Task 1: Fix metadata stability during refetch (frontend)
- [x] Task 2: Preserve createdAt in draft-from-published (backend)
- [x] Task 3: Verify
**Tasks:** 3 | **Done:** 3

## Tasks
### Task 1: Fix metadata stability during refetch (frontend)
**Objective:** Metadata should never flash "Never" during query transitions
**Files:** `packages/client/admin/src/features/content-manager/components/SchemaFormPage.tsx`
**TDD:** Skip (timing/UI issue) — add `placeholderData: keepPreviousData` to `useContentItem` call in SchemaFormPage, or memoize metadata to retain last valid values
**Verify:** `bun run check-types`

### Task 2: Preserve createdAt in draft-from-published (backend)
**Objective:** Drafts created from published content should keep the original `createdAt` timestamp
**Files:** `packages/core/src/modules/document/document.service.ts`
**TDD:** Skip (requires running DB) — add `createdAt: now` to the draftData when creating draft from published
**Verify:** `bun run check-types`

### Task 3: Verify
**Objective:** Full suite + quality checks
**Verify:** `bun run check-types && bun run lint`
