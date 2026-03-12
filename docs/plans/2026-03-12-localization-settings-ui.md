# Localization Settings UI Implementation Plan

Created: 2026-03-12
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary
**Goal:** Make the localization settings in the admin UI fully functional — add a multi-select for choosing available languages and convert the default locale from a text input to a select dropdown populated from the chosen languages.
**Architecture:** Update the backend `content.settings.ts` to use proper `SettingField.Select` types instead of `SettingField.Text`. Update the HTTP adapter's `getLocales()` to read from the `content` settings group. The existing `DynamicSettingsForm` + `SettingsFieldRenderer` pipeline already supports `select` and `multiSelect` UI types, so no frontend form changes needed.
**Tech Stack:** NestJS backend settings decorators, React admin UI (existing dynamic form system)

## Scope
### In Scope
- Change `defaultLocale` from `SettingField.Text` to `SettingField.Select` with locale options
- Add `locales` multi-select field to select available languages
- Update HTTP adapter `getLocales()` to read from `content` settings group
- Ensure `defaultLocale` select options reflect the available locales list

### Out of Scope
- Legacy `internationalization.setting.ts` cleanup (still used by old `@Setting` system)
- Per-schema i18n configuration (schema-level i18n settings)
- Locale auto-detection or fallback logic changes

## Context for Implementer
- **Patterns to follow:** `internationalization.setting.ts:24-33` — uses `@Field.Select` with locale options and `multiple: true`. The new `@SettingField.Select` supports the same pattern.
- **Key files:**
  - `packages/core/src/modules/content/content.settings.ts` — backend settings definition, i18n section (lines 133-159)
  - `packages/core/src/modules/database/modules/internationalization/setting/internationalization.setting.ts` — locale list source (lines 3-15)
  - `packages/client/admin/src/core/adapters/http-adapter.ts` — `getLocales()` at lines 410-455
  - `packages/client/admin/src/features/settings/components/SettingsFieldRenderer.tsx` — already handles `select` (line 50) and `multiSelect` (line 61)
  - `packages/core/src/modules/discovery/services/metadata-extractor.service.ts:545-547` — maps `multiple: true` to `uiOptions.type = 'multiSelect'`
- **Gotchas:** The `SettingSelectOptions.options` type expects `ReadonlyArray<{ label: string; value: string }>`. The existing locale list in `internationalization.setting.ts` already uses this format.

## Assumptions
- `SettingField.Select` with `multiple: true` maps through discovery → `multiSelect` UI type → `RHFMultiSelect` component — supported by `metadata-extractor.service.ts:545-547`
- The `content` settings group is already discovered and shown as a tab in the admin settings page — supported by `SettingsPage.tsx` loading all discovered settings
- The `getLocales()` adapter method can read from `/settings/content` instead of `/settings/internationalization` — Tasks 1-2 depend on this

## Progress
- [x] Task 1: Update content settings with proper locale fields (backend)
- [x] Task 2: Update HTTP adapter getLocales() to read from content settings
- [x] Task 3: Verify
**Total Tasks:** 3 | **Completed:** 3 | **Remaining:** 0

## Implementation Tasks

### Task 1: Update content settings with proper locale fields (backend)
**Objective:** Replace the text input for `defaultLocale` with a select dropdown and add a `locales` multi-select field
**Dependencies:** None

**Files:**
- Modify: `packages/core/src/modules/content/content.settings.ts`

**Key Decisions / Notes:**
- Import the `locales` array from `internationalization.setting.ts` (or define inline) — use the same `{ label, value }` format
- Change `@SettingField.Text` on `defaultLocale` to `@SettingField.Select` with locale options
- Add new `locales` field with `@SettingField.Select({ multiple: true, options: locales, default: ['en'] })` in the i18n section, ordered before `defaultLocale`

**Definition of Done:**
- [ ] `defaultLocale` uses `SettingField.Select` with locale options
- [ ] `locales` field exists with multi-select and locale options
- [ ] `bun run check-types` passes

**Verify:** `bun run check-types`

### Task 2: Update HTTP adapter getLocales() to read from content settings
**Objective:** The adapter should read locale configuration from the `content` settings group (where the UI now shows them) instead of the legacy `internationalization` group
**Dependencies:** Task 1

**Files:**
- Modify: `packages/client/admin/src/core/adapters/http-adapter.ts`

**Key Decisions / Notes:**
- Change `getLocales()` to fetch from `/settings/content` instead of `/settings/internationalization`
- The response shape stays the same — just the source group changes
- Keep the hardcoded `availableLocales` list as the full list of possible locales (these are the options shown in the multi-select)

**Definition of Done:**
- [ ] `getLocales()` reads from `/settings/content`
- [ ] Configured locales and default locale still resolve correctly
- [ ] `bun run check-types` passes

**Verify:** `bun run check-types`

### Task 3: Verify
**Objective:** Full suite + quality checks
**Verify:** `bun run check-types && bun run lint`
