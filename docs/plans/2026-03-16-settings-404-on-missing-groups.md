# Settings Endpoints Return 404 When No Settings Saved Fix Plan

Created: 2026-03-16
Status: VERIFIED
Approved: Yes
Iterations: 1
Worktree: No
Type: Bugfix

## Summary

**Symptom:** `GET /settings/{group}` returns 404 "No settings found for group" for api-keys, rbac, activity (and potentially other groups). Admin UI settings pages show broken state instead of default values. Discovery endpoints (`GET /discovery/settings/*`) return 200 fine.

**Trigger:** When settings haven't been persisted to the database — either initialization failed silently, DB was cleared, or it's a fresh install.

**Root Cause:** `packages/core/src/modules/settings/settings.controller.ts:31-32` — `getSettings()` throws `NotFoundException` when `getSettingsByGroup()` returns an empty array. There is no fallback to return default values from the registered schema (`registeredSchemas` map in `SettingsService`). The `updateSetting()` method at `settings.service.ts:216-218` also throws when a setting doesn't exist in DB, preventing users from saving settings via the UI.

## Investigation

- **Discovery vs Settings endpoints:** Discovery reads from in-memory metadata (`DiscoveryService.settingsSchemas`) and works correctly. Settings reads from the database (`settingModel.findMany`) and fails when empty.
- **Initialization flow:** `SettingsInitializer` (created via `useFactory` in `SettingsModule.forFeature()`) calls `registerSettingsFromSchema()` during `onApplicationBootstrap`. This writes default values to DB. However, errors are caught and only logged as warnings — if DB writes fail, the server continues with an empty settings table.
- **`registeredSchemas` map:** `registerSettingsFromSchema()` always populates `this.registeredSchemas` (in-memory) even if DB writes fail. The schemas with their defaults are available to construct a fallback response.
- **All affected modules** use the same `SettingsModule.forFeature()` pattern: `ApiKeysModule`, `RBACModule`, `ActivityModule`, `AuthModule`, etc. Auth may work because its initializer runs first.
- **`updateSetting()`** (line 216) throws `Setting with key "..." not found` when the setting doesn't exist in DB, which means the PUT endpoint also breaks for uninitialized groups.

## Fix Approach

**Files:** `packages/core/src/modules/settings/settings.service.ts`, `packages/core/src/modules/settings/settings.controller.ts`

**Strategy:**
1. Add `getDefaultsByGroup(group)` method to `SettingsService` that returns default key-value pairs from `registeredSchemas` when the group has a registered schema.
2. Modify `SettingsController.getSettings` to fall back to defaults when DB returns empty — only throw 404 for truly unknown groups (no schema registered).
3. Modify `SettingsService.updateSetting` to create the setting (upsert) when it doesn't exist in DB but is a valid key for the group's schema, instead of throwing.

**Tests:** Add E2E test coverage for settings fallback behavior.

## Progress

- [x] Task 1: Fix settings endpoints
- [x] Task 2: Verify
- [x] Task 3: Fix frontend settings form data shape mismatch
- [x] Task 4: Re-verify
      **Tasks:** 4 | **Done:** 4

## Tasks

### Task 1: Fix settings endpoints

**Objective:** Make GET and PUT settings endpoints resilient when DB has no entries for a group.

**Files:**
- `packages/core/src/modules/settings/settings.service.ts`
- `packages/core/src/modules/settings/settings.controller.ts`

**TDD:**
1. Write regression E2E test that verifies `GET /settings/api-keys` returns 200 with default values (currently fails with 404)
2. Add `getDefaultsByGroup(group)` to `SettingsService` — returns `Record<string, unknown> | null` from `registeredSchemas` using `getSettingFields()` metadata
3. Modify `SettingsController.getSettings`: when `getSettingsByGroup()` returns empty, call `getDefaultsByGroup()` — return defaults if found, throw 404 only if no schema registered
4. Modify `SettingsService.updateSetting`: when setting not found in DB, check if key is valid for the group's schema; if yes, create the setting with provided value instead of throwing

**Verify:** `bun run check-types && bun run test:e2e --project=api`

### Task 2: Verify

**Objective:** Full suite + quality checks
**Verify:** `bun run check-types && bun run lint`
