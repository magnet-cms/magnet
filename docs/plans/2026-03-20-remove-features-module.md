# Remove FeaturesModule Wrapper Implementation Plan

Created: 2026-03-20
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Remove the `FeaturesModule` indirection from ALL example apps and list `MagnetModule.forRoot()` and feature modules directly in each `AppModule`'s imports array.

**Architecture:** Replace `FeaturesModule.forRoot(MagnetModule.forRoot([...]))` with flat imports: `MagnetModule.forRoot([...])` followed by individual feature modules. NestJS resolves the imports array in order, so `MagnetModule.forRoot()` being listed before feature modules guarantees proper initialization order — no wrapper needed.

**Tech Stack:** NestJS module system (no new dependencies)

## Scope

### In Scope

- Remove `FeaturesModule` wrapper from all 5 example apps (drizzle-supabase, drizzle-neon, drizzle-sqlite, drizzle-mysql, mongoose)
- Delete all 5 `features.module.ts` files
- Update the `database.module.ts` comment that references FeaturesModule
- Replace `require()` deferred imports with standard ES imports in `app.module.ts`

### Out of Scope

- Changes to core packages
- Changes to feature module internals (articles, cats, owners, etc.)
- Changes to `testd56c2df7/` playground-generated module

## Context for Implementer

> The FeaturesModule pattern was used to defer loading of feature modules (via `require()`) until after `MagnetModule.forRoot()` had initialized. This is unnecessary — NestJS resolves imports in array order, so listing `MagnetModule.forRoot()` before feature modules in the same imports array guarantees proper initialization.

- **Pattern to follow:** User's desired pattern from the task description — flat imports in AppModule
- **Conventions:** Use standard ES `import` statements, no `require()`
- **Key files:**
  - `apps/examples/*/src/app.module.ts` — 5 files to modify
  - `apps/examples/*/src/modules/features.module.ts` — 5 files to delete
  - `packages/core/src/modules/database/database.module.ts:66` — comment to update

## Feature Inventory

| File | Current Role | Action | Task |
|------|-------------|--------|------|
| `drizzle-supabase/src/modules/features.module.ts` | Wraps MagnetModule + 5 feature modules | Delete | Task 1 |
| `drizzle-supabase/src/app.module.ts` | Imports FeaturesModule | Rewrite imports | Task 1 |
| `drizzle-neon/src/modules/features.module.ts` | Wraps MagnetModule + 5 feature modules | Delete | Task 2 |
| `drizzle-neon/src/app.module.ts` | Imports FeaturesModule | Rewrite imports | Task 2 |
| `drizzle-sqlite/src/modules/features.module.ts` | Wraps MagnetModule + 5 feature modules | Delete | Task 2 |
| `drizzle-sqlite/src/app.module.ts` | Imports FeaturesModule | Rewrite imports | Task 2 |
| `drizzle-mysql/src/modules/features.module.ts` | Wraps MagnetModule + 5 feature modules | Delete | Task 2 |
| `drizzle-mysql/src/app.module.ts` | Imports FeaturesModule | Rewrite imports | Task 2 |
| `mongoose/src/modules/features.module.ts` | Wraps MagnetModule + 4 feature modules | Delete | Task 2 |
| `mongoose/src/app.module.ts` | Imports FeaturesModule | Rewrite imports | Task 2 |
| `packages/core/.../database.module.ts` | Comment references FeaturesModule | Update comment | Task 3 |

## Assumptions

- NestJS resolves imports array in declaration order — supported by NestJS docs and standard behavior — Tasks 1, 2 depend on this
- Feature modules only depend on `MagnetModule.forFeature()` being available (which requires `MagnetModule.forRoot()` to have run first) — verified by reading all feature modules — Tasks 1, 2 depend on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Module initialization order issue | Very Low | High | NestJS guarantees import order; type-check all examples after changes |

## Goal Verification

### Truths

1. No `FeaturesModule` class or file exists in any example app
2. No `require()` calls exist in any `app.module.ts`
3. Each `app.module.ts` imports `MagnetModule.forRoot()` and feature modules as flat siblings in the imports array
4. `bun run check-types` passes for all examples
5. The `database.module.ts` comment no longer references FeaturesModule

### Artifacts

- `apps/examples/*/src/app.module.ts` — all 5 files with flat import structure
- `packages/core/src/modules/database/database.module.ts` — updated comment

## Progress Tracking

- [x] Task 1: drizzle-supabase example
- [x] Task 2: Remaining 4 examples
- [x] Task 3: Update core comment

**Total Tasks:** 3 | **Completed:** 3 | **Remaining:** 0

## Implementation Tasks

### Task 1: drizzle-supabase Example

**Objective:** Remove FeaturesModule from drizzle-supabase and list all modules flat in AppModule imports.

**Files:**

- Modify: `apps/examples/drizzle-supabase/src/app.module.ts`
- Delete: `apps/examples/drizzle-supabase/src/modules/features.module.ts`

**Key Decisions / Notes:**

- Replace `FeaturesModule` import with direct imports of ArticlesModule, CatsModule, OwnersModule, VeterinariansModule, MedicalRecordsModule
- Keep `ConfigModule.forRoot({ isGlobal: true })` first, then `MagnetModule.forRoot([...])`, then feature modules
- Use standard ES `import` statements, not `require()`
- Do NOT include `testd56c2df7/` module — that's playground-generated and gitignored

**Definition of Done:**

- [ ] `app.module.ts` has flat imports: ConfigModule, MagnetModule.forRoot(), then 5 feature modules
- [ ] No `FeaturesModule` reference in drizzle-supabase
- [ ] `features.module.ts` deleted
- [ ] `bun run check-types --filter=drizzle-supabase-example` passes

**Verify:**

- `bun run check-types --filter=drizzle-supabase-example`

---

### Task 2: Remaining 4 Examples (drizzle-neon, drizzle-sqlite, drizzle-mysql, mongoose)

**Objective:** Apply the same FeaturesModule removal pattern to all other examples.
**Dependencies:** Task 1 (use as reference pattern)

**Files:**

- Modify: `apps/examples/drizzle-neon/src/app.module.ts`
- Delete: `apps/examples/drizzle-neon/src/modules/features.module.ts`
- Modify: `apps/examples/drizzle-sqlite/src/app.module.ts`
- Delete: `apps/examples/drizzle-sqlite/src/modules/features.module.ts`
- Modify: `apps/examples/drizzle-mysql/src/app.module.ts`
- Delete: `apps/examples/drizzle-mysql/src/modules/features.module.ts`
- Modify: `apps/examples/mongoose/src/app.module.ts`
- Delete: `apps/examples/mongoose/src/modules/features.module.ts`

**Key Decisions / Notes:**

- drizzle-neon, drizzle-sqlite, drizzle-mysql have 5 feature modules each (Cats, Owners, Veterinarians, MedicalRecords, Posts)
- mongoose has 4 feature modules (Cats, Owners, Veterinarians, MedicalRecords — no Posts or Articles)
- drizzle-neon, drizzle-sqlite, drizzle-mysql pass `{ admin: true }` as second arg to `MagnetModule.forRoot()` — preserve this
- mongoose also passes `{ admin: true }` — preserve this

**Definition of Done:**

- [ ] All 4 `app.module.ts` files have flat imports
- [ ] All 4 `features.module.ts` files deleted
- [ ] No `FeaturesModule` reference in any example
- [ ] `bun run check-types` passes

**Verify:**

- `bun run check-types`

---

### Task 3: Update Core Database Module Comment

**Objective:** Update the `database.module.ts` comment that references the old FeaturesModule pattern.
**Dependencies:** Task 1

**Files:**

- Modify: `packages/core/src/modules/database/database.module.ts` (lines 62-68, the full `forFeature()` JSDoc comment)

**Key Decisions / Notes:**

- Current comment block (lines 62-68): `"IMPORTANT: Feature modules that call forFeature() must be loaded AFTER MagnetModule.forRoot() has run (which calls register()). Use a FeaturesModule with require() to defer loading. See apps/examples for the pattern."`
- Update to reflect the new pattern: list feature modules after MagnetModule.forRoot() in the imports array

**Definition of Done:**

- [ ] Comment updated to describe flat-import pattern
- [ ] `bun run check-types` passes

**Verify:**

- `bun run check-types --filter=@magnet-cms/core`
