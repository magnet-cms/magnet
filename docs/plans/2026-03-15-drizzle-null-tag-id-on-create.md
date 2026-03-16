# Drizzle NOT NULL constraint on empty draft creation Fix Plan

Created: 2026-03-15
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Bugfix

## Summary

**Symptom:** POST /content/cat/new returns 400: `null value in column "tag_i_d" of relation "cats" violates not-null constraint` when creating an empty draft entry.

**Trigger:** Clicking "create entry" in the admin UI, which creates an empty document via `POST /content/:schema/new` with `data: {}`. This is the expected flow — empty drafts are filled via auto-save, and validation only runs on publish.

**Root Cause:** `packages/adapters/db-drizzle/src/schema/schema.generator.ts:183-184` — `generateColumn()` applies `.notNull()` to all columns where `options.required && !options.nullable`. This translates the application-level `required` constraint (validated on publish) into a PostgreSQL NOT NULL constraint, which rejects empty inserts at the database level.

The Mongoose adapter works correctly because MongoDB has no database-level NOT NULL — Mongoose's `required` is application-level validation, skipped via `validateBeforeSave: false` when `skipValidation: true` is passed.

## Investigation

- **Entry point:** `ContentController.createEmpty()` (`content.controller.ts:108`) calls `contentService.create(schema, {}, ...)` with empty data
- **Document service:** `DocumentService.create()` (`document.service.ts:60`) builds `documentData` with system fields only (`documentId`, `locale`, `status`, timestamps) and calls `model.create(documentData, { skipValidation: true })`
- **Drizzle model:** `DrizzleModel.create()` (`drizzle.model.ts:138`) calls `_prepareData(data, true)` which only processes keys present in `data` — user-defined fields like `tagID`, `name`, etc. are absent
- **INSERT result:** Drizzle generates INSERT with only system columns. PostgreSQL applies DEFAULT for omitted columns — but user fields have no DEFAULT and are NOT NULL → constraint violation
- **Schema generator:** `generateColumn()` applies `.notNull()` for `required: true` fields, creating the database-level constraint that prevents empty draft inserts
- **Mongoose comparison:** Mongoose adapter's `Prop` decorator sets `required` as app-level validation, bypassed with `validateBeforeSave: false` on draft creation. MongoDB has no NOT NULL equivalent.

## Fix Approach

**Files:** `packages/adapters/db-drizzle/src/schema/schema.generator.ts`

**Strategy:** Remove `.notNull()` from user-defined content columns in `generateColumn()`. The `required` flag is an application-level concern — validated by class-validator decorators on publish, not a database constraint. System columns (`id`, `documentId`, `locale`, `status`, timestamps) are unaffected since they're defined directly in `generateSchema()`, not through `generateColumn()`.

After this change, the auto-migration system will detect the nullable change on next startup and generate an `ALTER COLUMN ... DROP NOT NULL` migration for existing databases.

**Tests:** `packages/adapters/db-drizzle/src/__tests__/schema-generator.test.ts` (may need to create if doesn't exist)

## Progress

- [x] Task 1: Fix and test
- [x] Task 2: Verify
      **Tasks:** 2 | **Done:** 2

## Tasks

### Task 1: Fix and test

**Objective:** Remove `.notNull()` from user-defined columns and add regression test
**Files:** `packages/adapters/db-drizzle/src/schema/schema.generator.ts`, test file for schema generator
**TDD:** Write test asserting `required: true` columns do NOT have `.notNull()` → verify FAILS → remove `.notNull()` line → verify PASS
**Verify:** `bun test` in db-drizzle package

### Task 2: Verify

**Objective:** Full suite + quality checks
**Verify:** `bun run check-types && bun run lint`
