# Settings PUT 400 Validation Error Fix Plan

Created: 2026-03-14
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Bugfix

## Summary
**Symptom:** All PUT requests to /settings/* return 400 "Validation failed" with error `"undefined": ["an unknown value was passed to the validate function"]`
**Trigger:** Any settings update from admin UI (PUT /settings/general, or any other group)
**Root Cause:** `packages/core/src/modules/settings/settings.service.ts:215` and `:514` — `validate()` from class-validator is called without `forbidUnknownValues: false`. Since class-validator 0.14.0 (installed: 0.14.1), `forbidUnknownValues` defaults to `true`, rejecting objects of classes with no class-validator decorators. All settings schemas use custom `@SettingField.*` decorators (metadata only, no class-validator metadata), so every `validate()` call fails.

## Investigation
- class-validator version: 0.14.1 — `forbidUnknownValues` defaults to `true` since 0.14.0
- Settings schemas (e.g., `GeneralSettings`) use `@SettingField.Text`, `@SettingField.Boolean`, `@SettingField.Select` — these are custom metadata decorators, NOT class-validator decorators
- The existing code comments (lines 211-214, 511-513) already note that `whitelist`/`forbidNonWhitelisted` shouldn't be used because of custom decorators — but `forbidUnknownValues` was not addressed
- The error format (`"undefined": [...]`) comes from `formatValidationErrors` where `error.property` is `undefined` — this is the specific shape class-validator produces for the "unknown value" validation error
- Two affected code paths: `validateSettingValue` (called by `updateSetting`) and `validatePartialUpdates` (called by `update`)

## Fix Approach
**Files:** `packages/core/src/modules/settings/settings.service.ts`
**Strategy:** Add `forbidUnknownValues: false` to both `validate()` calls in `validateSettingValue` (line 215) and `validatePartialUpdates` (line 514). This allows the validate calls to silently pass for settings classes with no class-validator decorators, while still validating any settings classes that do add class-validator decorators.
**Tests:** Verify fix by running type check and confirming the app works.

## Progress
- [x] Task 1: Fix validate() calls
- [x] Task 2: Verify
**Tasks:** 2 | **Done:** 2

## Tasks
### Task 1: Fix validate() calls
**Objective:** Add `forbidUnknownValues: false` to both `validate()` invocations in settings.service.ts
**Files:** `packages/core/src/modules/settings/settings.service.ts`
**TDD:** This is a one-line config fix per call site — no regression test needed beyond verification
**Verify:** `bun run check-types`

### Task 2: Verify
**Objective:** Full suite + quality checks
**Verify:** `bun run check-types && bun run lint`
