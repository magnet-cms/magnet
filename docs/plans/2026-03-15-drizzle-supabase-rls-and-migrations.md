# Drizzle-Supabase RLS & Migrations Fix Plan

Created: 2026-03-15
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Bugfix

## Summary

**Symptom:** (1) drizzle-supabase example app has an empty `migrations/` folder — no migration files are generated despite tables being created. (2) Supabase database linter reports 21 tables with RLS disabled, 4 tables with sensitive columns exposed via PostgREST, function with mutable search_path, and 4 admin tables with RLS but no policies.

**Trigger:** (1) Starting the drizzle-supabase example app — tables are created but no migration files appear. (2) Running Supabase database linter on the local Docker setup.

**Root Cause:**

1. **Missing migrations config** — `apps/examples/drizzle-supabase/src/app.module.ts:42-49`: the `db` config has no `migrations` property. Without it, `DrizzleAdapter.ensureTablesCreated()` (`packages/adapters/db-drizzle/src/drizzle.adapter.ts:83-88`) falls through to legacy `CREATE TABLE IF NOT EXISTS` mode, completely skipping the `AutoMigration` system. No migration files are ever generated.

2. **RLS trigger too narrow** — `apps/examples/drizzle-supabase/docker/init-vault.sql:19-24`: the `_magnet_enable_rls_on_admin_tables()` event trigger only covers 4 admin tables (`webhooks`, `apikeys`, `apikeyusages`, `settings`). All 21 other Magnet-created tables (content, auth, system) get no RLS. Since Supabase exposes the `public` schema via PostgREST (`PGRST_DB_SCHEMAS: public,...`), tables without RLS are readable/writable by anyone with the `anon` key — exposing passwords, tokens, session IDs, etc. The function also lacks `SET search_path = ''` (Supabase linter WARN).

## Investigation

- Confirmed both `drizzle-supabase` and `drizzle-neon` example apps lack `migrations` config — both use legacy table creation mode.
- The auto-migration system (`AutoMigration.run()`) writes migration files via `MigrationGenerator.writeMigrationFile()` to `migrationConfig.directory` (default `./migrations`). Without the config, this code path is never reached.
- The RLS event trigger fires on DDL `CREATE TABLE` in `public` schema — works for both legacy and migration-based table creation. But the `admin_tables` filter excludes all content tables, auth tables, and system tables.
- Magnet backend connects directly as `postgres` (superuser) at port 5432, which bypasses RLS. PostgREST uses `authenticator` role with `anon`/`authenticated` — subject to RLS. So RLS blocks PostgREST but doesn't affect the backend.
- The 4 admin tables with "RLS Enabled No Policy" (INFO) is correct behavior — RLS without policies blocks all PostgREST access, which is desired since Magnet manages all data through its own API.

## Fix Approach

**Files:**
- `apps/examples/drizzle-supabase/src/app.module.ts` — add `migrations` config to db options
- `apps/examples/drizzle-supabase/docker/init-vault.sql` — expand RLS trigger to ALL public schema tables, fix search_path
- `apps/examples/drizzle-neon/src/app.module.ts` — add `migrations` config (same gap)

**Strategy:**
1. Add `migrations: { mode: 'auto', directory: './migrations' }` to the db config in both example apps. This enables the AutoMigration system which generates and applies migration files on startup.
2. Rewrite the RLS event trigger to enable RLS on ALL tables created in the `public` schema (not just 4 admin tables). Rename function to `_magnet_enable_rls` for accuracy. Add `SET search_path = ''` for security.
3. No RLS policies needed — RLS without policies blocks all PostgREST access, which is correct for Magnet's architecture (backend uses direct PostgreSQL connection, bypassing RLS).

**Tests:** Verify existing drizzle adapter test suite passes (86 tests). Type check entire monorepo.

## Progress

- [x] Task 1: Fix migrations config and RLS trigger
- [x] Task 2: Verify
      **Tasks:** 2 | **Done:** 2

## Tasks

### Task 1: Fix migrations config and RLS trigger

**Objective:** Enable auto-migration system in both example apps and expand RLS protection to all Magnet tables.

**Files:**
- `apps/examples/drizzle-supabase/src/app.module.ts`
- `apps/examples/drizzle-supabase/docker/init-vault.sql`
- `apps/examples/drizzle-neon/src/app.module.ts`

**Steps:**
1. Add `migrations: { mode: 'auto', directory: './migrations' }` to the `db` config in `drizzle-supabase/src/app.module.ts`
2. Add the same `migrations` config to `drizzle-neon/src/app.module.ts`
3. Rewrite `init-vault.sql`:
   - Rename function to `_magnet_enable_rls`
   - Remove `admin_tables` filter — enable RLS on ALL tables created in `public` schema
   - Add `SET search_path = ''` to the function definition
   - Update event trigger name to match

**Verify:** `bun run check-types`

### Task 2: Verify

**Objective:** Full suite + quality checks

**Verify:** `cd packages/adapters/db-drizzle && bun test` (86 tests), `bun run check-types`, `bun run lint`
