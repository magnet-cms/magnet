# Activity Page Crash & Missing Sidebar Entry Fix Plan

Created: 2026-03-13
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Bugfix

## Summary
**Symptom:** Navigating to `/admin/activity` crashes with `Uncaught Error: A <Select.Item /> must have a value prop that is not an empty string`. The activity page is also missing from the Administration section in the sidebar menu. Additionally, the Activity schema appears as a content type in the Content Manager (and shouldn't — it's a system schema with its own dedicated page).

**Trigger:** Loading the `/admin/activity` page with the filter dropdowns.

**Root Cause:** Three related issues:

1. **Select.Item crash** — `packages/client/admin/src/features/activity/components/ActivityPage.tsx:60,73` — Both `ACTION_OPTIONS` and `ENTITY_TYPE_OPTIONS` define their "All" option with `value: ''` (empty string). Radix UI's `<SelectItem>` throws when given an empty string value because empty string is reserved for clearing the selection/showing placeholder.

2. **Missing sidebar entry** — `packages/client/admin/src/layouts/AuthedLayout.tsx:130-151` — The `navSecondary` array (labeled "Administration") includes Users, Access Control, API Keys, and Settings, but not Activity.

3. **Activity schema visible in Content Manager** — `packages/core/src/modules/activity/schemas/activity.schema.ts:10` — Uses `@Schema({ versioning: false, i18n: false })` without `visible: false`. The `SchemaOptions` type already supports `visible?: boolean` (default `true`), and the discovery service already filters schemas with `visible !== false`. Adding `visible: false` hides it from Content Manager.

## Investigation
- The Radix UI Select component explicitly validates that `<Select.Item>` values are non-empty strings (error message confirms this).
- The `defaultSchemaOptions` in `@Schema()` decorator default `visible` to `true` (`packages/common/src/decorators/schema/schema.decorator.ts:8`).
- The `DiscoveryService.getDiscoveredSchemas()` already has filtering: `EXCLUDED_SCHEMAS` list AND `schema.options?.visible !== false` check (`discovery.service.ts:34-35`).
- The `History` and `Setting` schemas are already excluded via the `EXCLUDED_SCHEMAS` list. Using `visible: false` is the cleaner approach for Activity since it's part of the schema's own options.
- The Playground scans filesystem modules from the example app's `src/modules/` directory, not from `@magnet-cms/core`, so the Activity schema from core wouldn't appear there.

## Fix Approach
**Files:**
- `packages/client/admin/src/features/activity/components/ActivityPage.tsx` — Replace empty string values with sentinel `'all'` for both option arrays; update filter logic to convert `'all'` back to `undefined` when building search params.
- `packages/client/admin/src/layouts/AuthedLayout.tsx` — Add Activity entry to `navSecondary` array, import `Activity` icon from lucide-react.
- `packages/core/src/modules/activity/schemas/activity.schema.ts` — Add `visible: false` to `@Schema()` options.

**Tests:** Type check + lint + production startup verification. The frontend changes are UI-only (Select component fix and sidebar navigation), best verified via execution.

## Progress
- [x] Task 1: Fix Select.Item crash, add sidebar entry, hide Activity schema
- [x] Task 2: Verify
**Tasks:** 2 | **Done:** 2

## Tasks
### Task 1: Fix Select.Item crash, add sidebar entry, hide Activity schema
**Objective:** Fix all three issues in a single task since they are small, isolated changes.
**Files:**
- `packages/client/admin/src/features/activity/components/ActivityPage.tsx`
- `packages/client/admin/src/layouts/AuthedLayout.tsx`
- `packages/core/src/modules/activity/schemas/activity.schema.ts`
**Steps:**
1. In `ActivityPage.tsx`: Change `value: ''` to `value: 'all'` in both `ACTION_OPTIONS` and `ENTITY_TYPE_OPTIONS`. Update the search params construction to treat `'all'` as `undefined`.
2. In `AuthedLayout.tsx`: Import `Activity` icon from lucide-react. Add `{ title: 'Activity', url: '/activity', icon: Activity }` to the `navSecondary` array (before Settings).
3. In `activity.schema.ts`: Change `@Schema({ versioning: false, i18n: false })` to `@Schema({ versioning: false, i18n: false, visible: false })`.
**Verify:** `bun run check-types && bun run lint`

### Task 2: Verify
**Objective:** Full type check + lint + build verification
**Verify:** `bun run check-types && bun run lint && cd packages/core && bun run build`
