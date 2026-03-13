# Database Migrations System Implementation Plan

Created: 2026-03-13
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Implement a robust database migrations system for Magnet CMS's Drizzle adapter, supporting both automatic (development) and manual (CLI-based) migration workflows, with schema diffing via drizzle-kit, migration runner with history tracking and locking, a standalone CLI package, and all three SQL dialects (PostgreSQL, MySQL, SQLite).

**Architecture:** Migration engine lives inside the Drizzle adapter (`packages/adapters/drizzle/src/migrations/`). A bridge maps Magnet's decorator-generated Drizzle schemas to drizzle-kit's programmatic API for introspection and diff. A new `@magnet-cms/cli` package (`packages/cli/`) exposes `magnet migrate:*` commands using Commander.js. Auto-migration mode integrates with `DrizzleAdapter.ensureTablesCreated()` for development workflows.

**Tech Stack:** drizzle-kit (schema diff/introspection), drizzle-orm (SQL execution), Commander.js + @inquirer/prompts (CLI), bun:test (unit tests), Playwright (E2E)

## Scope

### In Scope
- Migration types and configuration (`MigrationConfig` on `DrizzleConfig`)
- Migration history table (`_magnet_migrations`) and lock table (`_magnet_migrations_lock`)
- Migration runner with transaction support, checksum validation, ordered execution
- Drizzle-kit bridge for schema diffing (decorator schemas → drizzle-kit input)
- Migration file generation (`.ts` files with `up`/`down` functions, all 3 dialects)
- Dangerous operation detection (column drops, type changes)
- Standalone `@magnet-cms/cli` package with `magnet migrate:*` commands
- Auto-migration mode for development (detect + generate + apply on startup)
- `create-magnet` template updates (migrations folder, config)
- Unit tests for all migration components
- E2E tests for CLI commands
- MDX documentation

### Out of Scope
- Mongoose adapter migrations (Mongoose has its own migration patterns)
- Migration squashing / branch merging
- Multi-tenant per-schema migrations
- Admin UI migration management panel
- Cloud backup integration before migrations
- Seed data system (separate feature)

### Architecture Decision: No `packages/migrations/` Package
Plan 011 originally proposed a standalone `packages/migrations/` package. Per user clarification, the migration engine lives inside `packages/adapters/drizzle/src/migrations/` instead. This keeps it co-located with the adapter it serves — Mongoose has its own migration patterns and wouldn't share this code. **Do not create `packages/migrations/`.**

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - NestJS Injectable services: see `packages/core/src/modules/logging/logger.service.ts`
  - Drizzle adapter structure: `packages/adapters/drizzle/src/drizzle.adapter.ts` — singleton `DrizzleAdapter` class, exported as `Adapter`
  - Schema generation: `packages/adapters/drizzle/src/schema/schema.generator.ts` — `getOrGenerateSchema()` produces `pgTable()` definitions from decorators
  - CLI package with Commander.js: `packages/create-magnet/` — uses `commander`, `@inquirer/prompts`, `ansis` for colors
  - E2E test fixtures: `apps/e2e/src/fixtures/base.fixture.ts`
  - Unit test setup: `bun:test` with `describe`/`it`/`expect`/`spyOn` (see `packages/core/src/modules/logging/logger.service.test.ts`)

- **Conventions:**
  - Biome for linting/formatting (`bun run lint`)
  - TypeScript strict mode, no `any` (use `unknown` + type guards)
  - Conventional commits: `feat(migrations): ...`
  - tsup for package builds (ESM + CJS + DTS)
  - `~/*` path alias maps to `./src/*` in adapter package

- **Key files:**
  - `packages/adapters/drizzle/src/drizzle.adapter.ts` — DrizzleAdapter class with `ensureTablesCreated()`, `schemaRegistry`, `connect()`, `forFeature()`
  - `packages/adapters/drizzle/src/schema/schema.generator.ts` — `generateSchema()`, `getOrGenerateSchema()`, `schemaRegistry` (Map)
  - `packages/adapters/drizzle/src/types.ts` — `DrizzleConfig`, `DrizzleDB`, `SchemaMetadata`
  - `packages/common/src/types/database.types.ts` — `DatabaseAdapter` abstract class, `AdapterFeature`, `DrizzleConfig`
  - `packages/common/src/types/config.types.ts` — `MagnetModuleOptions`
  - `packages/create-magnet/src/generators/index.ts` — project scaffold generator
  - `packages/create-magnet/src/types.ts` — `ProjectConfig`, `DatabaseAdapter`

- **Gotchas:**
  - `DrizzleAdapter` is a singleton (`export const Adapter = new DrizzleAdapter()`), NOT a NestJS-managed instance. Migration code that runs at adapter level cannot use DI.
  - `schemaRegistry` in the adapter is a `Map<string, { table: PgTable; tableName: string }>` — populated during `forFeature()` calls.
  - The adapter currently only implements PostgreSQL (`createConnection`/`createConnectionAsync`). MySQL/SQLite throw `"not yet implemented"`. Migration multi-dialect support must account for this — dialect introspection can be implemented ahead of full adapter support.
  - `schema.generator.ts` also has its own internal `schemaRegistry` Map. The two registries are separate.
  - `DrizzleDB` type is `NodePgDatabase | PgDatabase<any>` — PostgreSQL only currently.
  - `drizzle-kit` is NOT currently a dependency — must be added to the drizzle adapter's devDependencies.
  - Biome rule `noDelete`: use `= undefined` instead of `delete`. Biome rule `noAssignInExpressions`: no `??=` in returns.

- **Domain context:**
  - Magnet schemas are defined via `@Schema()` and `@Field.*()` decorators on classes
  - The Drizzle adapter transforms these into `pgTable()` definitions at runtime
  - Currently, `ensureTablesCreated()` runs `CREATE TABLE IF NOT EXISTS` — this is the "lazy auto-migration" that this spec replaces
  - In production, auto-migration is dangerous. The new system adds a "manual" mode where migrations must be explicitly generated and applied via CLI.

## Runtime Environment

- **Start command:** `bun run dev` (from monorepo root) or `cd apps/examples/drizzle-neon && bun run dev`
- **Port:** 3000
- **Health check:** `GET /health`
- **Build:** `bun run build` (turborepo, builds all packages)
- **Test:** `bun test` (in individual packages) or `bun run test:e2e --project=api` (E2E)

## Assumptions

- drizzle-kit can be invoked for schema diffing — either via programmatic API (`drizzle-kit/api` if available) or via subprocess + temp config file as fallback. **Primary implementation path is subprocess fallback** (write temp schema file → invoke `drizzle-kit generate` CLI → parse output). Programmatic API is an optimization to explore in Task 4. — Tasks 4, 5 depend on this
- The `schemaRegistry` in `schema.generator.ts` is populated before migration diff runs (schemas are registered during module initialization) — supported by `forFeature()` calling `getOrGenerateSchema()` at `schema.generator.ts:27` — Tasks 4, 8 depend on this
- drizzle-kit supports MySQL and SQLite dialect SQL generation — supported by drizzle-kit documentation — Tasks 5, 7 depend on this
- Commander.js works as a standalone binary via `bin` field in package.json (same pattern as create-magnet) — supported by `packages/create-magnet/package.json:8` — Task 6 depends on this
- Migration files can be `.ts` files that are imported at runtime (using Bun's native TypeScript support or tsx) — Task 5 depends on this
- If drizzle-kit's programmatic API is insufficient, fallback: write temporary schema files to disk and invoke drizzle-kit CLI as subprocess — Tasks 4, 5 depend on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| drizzle-kit programmatic API doesn't expose what we need | Medium | High | Fallback to subprocess invocation of drizzle-kit CLI with temp config file. If drizzle-kit generate produces plain SQL files, parse and wrap in our Migration format. |
| MySQL/SQLite introspection fails since adapters don't connect yet | High | Medium | Implement introspectors as pure SQL generators that work against any connection. Test with SQLite in-memory and PG docker. MySQL can be tested with docker-compose. |
| Migration locking race conditions in distributed environments | Low | High | Use database-level advisory locks (PostgreSQL) or INSERT-based locking with timeout. Test with concurrent runner instances. |
| Auto-migration generates incorrect diff on complex schema changes | Medium | High | Always generate migration file for user review even in auto mode. Add `--dry-run` to preview SQL. Log all auto-applied migrations. |
| create-magnet changes break existing scaffold workflow | Low | Medium | Add migration config as optional, default to auto mode. Existing projects unaffected (no `migrations` key = current behavior). |

## Goal Verification

### Truths
1. Running `magnet migrate:generate` against a project with schema changes produces a valid `.ts` migration file with correct `up` and `down` SQL
2. Running `magnet migrate:up` applies pending migrations in order and records them in `_magnet_migrations`
3. Running `magnet migrate:down` rolls back the last migration and removes its history record
4. Running `magnet migrate:status` shows which migrations are applied vs pending
5. Starting a Drizzle app in auto mode with schema changes auto-generates and applies a migration
6. Starting a Drizzle app in manual mode with pending migrations logs a warning but does not auto-apply
7. The migration lock prevents two concurrent `migrate:up` invocations from running simultaneously

### Artifacts
1. `packages/adapters/drizzle/src/migrations/` — migration engine (types, runner, history, lock, bridge, generator)
2. `packages/cli/` — standalone CLI package with `magnet` binary
3. `packages/adapters/drizzle/src/migrations/__tests__/` — unit tests
4. `apps/e2e/tests/api/migrations.spec.ts` — E2E tests
5. `apps/docs/content/docs/migrations/` — MDX documentation

## Progress Tracking

- [x] Task 1: Migration Types & Configuration
- [x] Task 2: Migration History & Locking
- [x] Task 3: Migration Runner
- [x] Task 4: Drizzle-Kit Schema Bridge
- [x] Task 5: Schema Diff & Migration File Generator
- [x] Task 6: CLI Package: Setup & Core Commands
- [x] Task 7: CLI: Generate, Create & Utility Commands
- [x] Task 8: Auto-Migration Mode
- [x] Task 9: create-magnet Integration
- [x] Task 10: Unit Tests
- [x] Task 11: E2E Tests & Documentation

**Total Tasks:** 11 | **Completed:** 11 | **Remaining:** 0

## Implementation Tasks

### Task 1: Migration Types & Configuration

**Objective:** Define all migration-related types and add migration configuration to the adapter's config types.

**Dependencies:** None

**Files:**
- Create: `packages/adapters/drizzle/src/migrations/types.ts`
- Create: `packages/adapters/drizzle/src/migrations/index.ts`
- Modify: `packages/adapters/drizzle/src/types.ts` (add `migrations` to `DrizzleConfig`)
- Modify: `packages/adapters/drizzle/src/index.ts` (re-export migrations)
- Test: `packages/adapters/drizzle/src/migrations/__tests__/types.test.ts`

**Key Decisions / Notes:**
- Define `Migration` interface with `id`, `timestamp`, `description?`, `dangerous?`, `warnings?`, `up(db)`, `down(db)`
- Define `MigrationConfig` with `mode: 'auto' | 'manual'`, `directory: string`, `tableName: string`, `lockTableName: string`, `lockTimeout: number`, `transactional: boolean`
- Define `MigrationHistoryRecord` with `id`, `name`, `timestamp`, `appliedAt`, `checksum`
- Define `DiffResult` with arrays for tables/columns to create/drop/alter
- Define `MigrationError`, `MigrationLockError`, `MigrationChecksumError` error classes
- Add optional `migrations?: Partial<MigrationConfig>` to `DrizzleConfig` in `types.ts`
- Provide `DEFAULT_MIGRATION_CONFIG` with sensible defaults (`mode: 'auto'`, `directory: './migrations'`, `tableName: '_magnet_migrations'`, etc.)
- Follow pattern from `packages/adapters/drizzle/src/types.ts` for interface style

**Definition of Done:**
- [ ] All types are defined and exported from `migrations/index.ts`
- [ ] `DrizzleConfig` includes optional `migrations` field
- [ ] All types have JSDoc documentation
- [ ] `DEFAULT_MIGRATION_CONFIG` provides sensible defaults
- [ ] Error classes extend `Error` with proper `name` field
- [ ] Type tests verify the interfaces compile correctly
- [ ] No diagnostics errors

**Verify:**
- `cd packages/adapters/drizzle && bun test src/migrations/__tests__/types.test.ts`
- `bun run check-types`

---

### Task 2: Migration History & Locking

**Objective:** Implement the migration history table management and lock mechanism for preventing concurrent migrations.

**Dependencies:** Task 1

**Files:**
- Create: `packages/adapters/drizzle/src/migrations/migration-history.ts`
- Create: `packages/adapters/drizzle/src/migrations/migration-lock.ts`
- Test: `packages/adapters/drizzle/src/migrations/__tests__/migration-history.test.ts`
- Test: `packages/adapters/drizzle/src/migrations/__tests__/migration-lock.test.ts`

**Key Decisions / Notes:**
- `MigrationHistory` class handles:
  - `ensureTable()` — CREATE TABLE IF NOT EXISTS for `_magnet_migrations` (columns: id, name, timestamp, applied_at, checksum)
  - `getApplied()` — SELECT all applied migrations ordered by timestamp
  - `recordMigration(record)` — INSERT a new applied migration
  - `removeMigration(id)` — DELETE a migration record (for rollback)
  - `calculateChecksum(migration)` — SHA-256 hash of up + down function source
- `MigrationLock` class handles:
  - `ensureTable()` — CREATE TABLE IF NOT EXISTS for `_magnet_migrations_lock`
  - `acquire()` — INSERT lock row with timeout; throw `MigrationLockError` if locked
  - `release()` — DELETE lock row
  - `isLocked()` — check if a valid lock exists
  - Lock has an expiration based on `lockTimeout` config to handle crashed processes
- Both classes take a raw database connection (not Drizzle ORM) to work with any dialect
- Use `sql` template literal from `drizzle-orm` for dialect-agnostic SQL where possible
- For PostgreSQL: use `pg_advisory_lock` as a faster alternative when available

**Definition of Done:**
- [ ] `MigrationHistory.ensureTable()` creates the history table
- [ ] `MigrationHistory.getApplied()` returns applied migrations in order
- [ ] `MigrationHistory.recordMigration()` inserts a migration record
- [ ] `MigrationHistory.removeMigration()` deletes a migration record
- [ ] `MigrationLock.acquire()` gets a lock and throws `MigrationLockError` if already locked
- [ ] `MigrationLock.release()` releases the lock
- [ ] Stale locks (older than `lockTimeout`) are automatically cleaned up on `acquire()`
- [ ] Checksum calculation produces consistent results for same migration
- [ ] All tests pass with mocked database
- [ ] No diagnostics errors

**Verify:**
- `cd packages/adapters/drizzle && bun test src/migrations/__tests__/migration-history.test.ts`
- `cd packages/adapters/drizzle && bun test src/migrations/__tests__/migration-lock.test.ts`

---

### Task 3: Migration Runner

**Objective:** Implement the core migration runner that discovers, applies, and rolls back migrations.

**Dependencies:** Task 1, Task 2

**Files:**
- Create: `packages/adapters/drizzle/src/migrations/migration-runner.ts`
- Test: `packages/adapters/drizzle/src/migrations/__tests__/migration-runner.test.ts`

**Key Decisions / Notes:**
- `MigrationRunner` class is the main orchestrator:
  - Constructor takes `{ db, config: MigrationConfig }`
  - `up(options?: { to?: string })` — apply pending migrations up to optional target
  - `down(options?: { to?: string })` — rollback from latest, optionally to target
  - `status()` — return `{ applied: MigrationHistoryRecord[], pending: Migration[] }`
  - `discover(directory: string)` — load migration files from disk, sort by timestamp
  - Private: `applyMigration(migration)` — within transaction: run `up()`, record in history
  - Private: `rollbackMigration(migration)` — within transaction: run `down()`, remove from history
- Flow for `up()`:
  1. Acquire lock
  2. Load migration history
  3. Discover pending migrations (not yet applied)
  4. Validate checksums of applied migrations
  5. For each pending migration: BEGIN → `migration.up(db)` → INSERT history → COMMIT
  6. Release lock
- Flow for `down()`:
  1. Acquire lock
  2. Load migration history
  3. For each migration to rollback (reverse order): BEGIN → `migration.down(db)` → DELETE history → COMMIT
  4. Release lock
- Use try/finally to always release lock even on error
- Migration discovery: `fs.readdir()` on the migrations directory, filter `.ts`/`.js` files, dynamic import, sort by prefix number
- Transaction support controlled by `config.transactional` (default: true)
- If a migration fails mid-batch: stop, report which succeeded and which failed, leave lock released

**Definition of Done:**
- [ ] `runner.up()` applies all pending migrations in order
- [ ] `runner.down()` rolls back the last migration
- [ ] `runner.down({ to: 'id' })` rolls back to a specific migration
- [ ] `runner.status()` returns applied and pending migrations
- [ ] Lock is always released (even on error)
- [ ] Checksum mismatch throws `MigrationChecksumError`
- [ ] Failed migration stops the batch and reports clearly
- [ ] Transaction wraps each individual migration (not the whole batch)
- [ ] All tests pass
- [ ] No diagnostics errors

**Verify:**
- `cd packages/adapters/drizzle && bun test src/migrations/__tests__/migration-runner.test.ts`

---

### Task 4: Drizzle-Kit Schema Bridge

**Objective:** Bridge Magnet's decorator-generated Drizzle schemas to drizzle-kit's programmatic API for schema introspection and diffing.

**Dependencies:** Task 1

**Files:**
- Create: `packages/adapters/drizzle/src/migrations/schema-bridge.ts`
- Modify: `packages/adapters/drizzle/src/schema/schema.generator.ts` (export `schemaRegistry` or add getter)
- Modify: `packages/adapters/drizzle/package.json` (add `drizzle-kit` dependency)
- Test: `packages/adapters/drizzle/src/migrations/__tests__/schema-bridge.test.ts`

**Key Decisions / Notes:**
- The `schemaRegistry` in `schema.generator.ts` (line 22) is currently a private `Map`. We need to either export it or add a `getRegisteredSchemas()` function.
- **Spike first:** After installing drizzle-kit, inspect its exported API surface (`node_modules/drizzle-kit/api.d.ts` or `node_modules/drizzle-kit/index.d.ts`). Document exact available functions.
- `SchemaBridge` class:
  - `collectSchemas()` — read all registered schemas via `getRegisteredSchemas()` getter (see below)
  - `writeTemporarySchemaFile(path)` — **primary path**: write all schemas to a temp `.ts` file that drizzle-kit CLI can read
  - `writeTempDrizzleConfig(path, dialect)` — write a temp `drizzle.config.ts` pointing at the temp schema file
  - `invokeDrizzleKit(configPath)` — spawn `drizzle-kit generate` subprocess, capture output (SQL files)
  - `parseDrizzleKitOutput(outputDir)` — read generated SQL, wrap in our `Migration` format
  - Optimization: if drizzle-kit exports a programmatic `generateMigration()` or similar, use that instead of subprocess
- **schemaRegistry getter:** Add `export function getRegisteredSchemas(): ReadonlyMap<string, { table: ReturnType<typeof pgTable>; tableName: string }>` to `schema.generator.ts`. Do NOT export the raw Map or use `any`.
- The bridge must handle all 3 dialects:
  - PostgreSQL: `pgTable` from `drizzle-orm/pg-core` (current implementation)
  - MySQL: `mysqlTable` from `drizzle-orm/mysql-core` (schema.generator.ts currently only creates pgTable)
  - SQLite: `sqliteTable` from `drizzle-orm/sqlite-core`
- For MySQL/SQLite support, the bridge needs dialect-aware schema generation — extend `schema.generator.ts` or create dialect-specific generators
- **Important:** Don't modify the core `generateSchema()` function's behavior — add a parallel path for MySQL/SQLite schema generation
- Add `drizzle-kit` as a devDependency/peerDependency to the adapter

**Definition of Done:**
- [ ] `getRegisteredSchemas()` exported from `schema.generator.ts` returns `ReadonlyMap<string, { table; tableName }>`
- [ ] `SchemaBridge.collectSchemas()` returns all registered Drizzle table definitions
- [ ] Bridge produces valid input for drizzle-kit's diff engine
- [ ] Fallback mechanism works if programmatic API is unavailable
- [ ] drizzle-kit added as dependency
- [ ] All tests pass
- [ ] No diagnostics errors

**Verify:**
- `cd packages/adapters/drizzle && bun test src/migrations/__tests__/schema-bridge.test.ts`
- `bun run check-types`

---

### Task 5: Schema Diff & Migration File Generator

**Objective:** Diff current decorator schemas against database state and generate migration files with dialect-aware SQL.

**Dependencies:** Task 1, Task 4

**Files:**
- Create: `packages/adapters/drizzle/src/migrations/schema-diff.ts`
- Create: `packages/adapters/drizzle/src/migrations/migration-generator.ts`
- Create: `packages/adapters/drizzle/src/migrations/sql-generators/postgresql.ts`
- Create: `packages/adapters/drizzle/src/migrations/sql-generators/mysql.ts`
- Create: `packages/adapters/drizzle/src/migrations/sql-generators/sqlite.ts`
- Create: `packages/adapters/drizzle/src/migrations/sql-generators/index.ts`
- Test: `packages/adapters/drizzle/src/migrations/__tests__/schema-diff.test.ts`
- Test: `packages/adapters/drizzle/src/migrations/__tests__/migration-generator.test.ts`

**Key Decisions / Notes:**
- `SchemaDiff` class:
  - `diff(currentSchemas, databaseState)` — compare and produce `DiffResult`
  - Uses drizzle-kit under the hood for the heavy lifting
  - Wraps drizzle-kit's output in our `DiffResult` type
- `MigrationGenerator` class:
  - `generate(name: string, diff: DiffResult, dialect: Dialect)` — produce migration file content
  - `writeMigrationFile(directory, name, content)` — write `.ts` file to disk with sequential numbering (e.g., `0001_initial_schema.ts`)
  - Template produces: `export const migration: Migration = { id, timestamp, up(db) { ... }, down(db) { ... } }`
  - `detectDangerousOperations(diff)` — scan diff for column drops, type changes, table drops → set `dangerous: true`, populate `warnings[]`
- Dialect-specific SQL generators:
  - Each generator implements `generateUp(diff)` and `generateDown(diff)` returning SQL strings
  - Column type mapping per dialect (see Plan 011 mapping table)
  - Handle dialect-specific syntax (e.g., `ALTER TABLE ... MODIFY COLUMN` in MySQL vs `ALTER TABLE ... ALTER COLUMN` in PostgreSQL)
- Migration file numbering: scan existing files in directory, get highest number, increment
- `--dry-run` support: return the SQL without writing to disk

**Definition of Done:**
- [ ] `SchemaDiff.diff()` correctly detects new tables, dropped tables, new columns, dropped columns, type changes
- [ ] `MigrationGenerator.generate()` produces valid TypeScript migration files
- [ ] Generated `up()` and `down()` functions contain correct SQL for the dialect
- [ ] Dangerous operations are flagged with `dangerous: true` and warning messages
- [ ] File numbering is sequential (0001, 0002, ...)
- [ ] PostgreSQL, MySQL, and SQLite SQL generators produce correct dialect-specific SQL
- [ ] All tests pass
- [ ] No diagnostics errors

**Verify:**
- `cd packages/adapters/drizzle && bun test src/migrations/__tests__/schema-diff.test.ts`
- `cd packages/adapters/drizzle && bun test src/migrations/__tests__/migration-generator.test.ts`

---

### Task 6: CLI Package: Setup & Core Commands

**Objective:** Create the `@magnet-cms/cli` package with `magnet` binary and core migration commands (up, down, status).

**Dependencies:** Task 3

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/tsup.config.ts`
- Create: `packages/cli/bin/magnet.js`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/commands/migrate-up.ts`
- Create: `packages/cli/src/commands/migrate-down.ts`
- Create: `packages/cli/src/commands/migrate-status.ts`
- Create: `packages/cli/src/utils/config-loader.ts`
- Create: `packages/cli/src/utils/connection.ts`
- Modify: root `package.json` (verify `packages/cli` is covered by workspace glob; add explicitly if not)
- Test: `packages/cli/src/__tests__/migrate-up.test.ts`
- Test: `packages/cli/src/__tests__/migrate-status.test.ts`

**Key Decisions / Notes:**
- **Workspace registration:** Verify root `package.json` workspace glob (e.g., `"packages/*"`) covers `packages/cli`. If it uses an explicit list, add `"packages/cli"`. Run `bun install` after to verify linkage.
- Package structure follows `create-magnet` pattern:
  - `bin/magnet.js`: `#!/usr/bin/env node` shebang, imports compiled CLI
  - Dependencies: `commander`, `@inquirer/prompts`, `ansis` (colors), `@magnet-cms/adapter-drizzle`
  - Build: tsup (ESM + CJS + DTS)
- `ConfigLoader`:
  - Look for `magnet.config.ts`, `magnet.config.js`, or `drizzle.config.ts` in CWD
  - Extract database connection string and migration config
  - Fallback: read `DATABASE_URL` env var
- `migrate:up` command:
  - Load config, create database connection, instantiate `MigrationRunner`
  - Call `runner.up()`, display results (count, names, time per migration)
  - Exit code 0 on success, 1 on failure
- `migrate:down` command:
  - Same setup, call `runner.down()`
  - Accept `--to <id>` flag for rollback target
  - Display confirmation prompt for multiple rollbacks
- `migrate:status` command:
  - Call `runner.status()`, display table (using console formatting)
  - Show Applied/Pending status for each migration

**Definition of Done:**
- [ ] `packages/cli/` has valid package.json, tsconfig, tsup config
- [ ] `magnet migrate:up` applies pending migrations and displays results
- [ ] `magnet migrate:down` rolls back last migration
- [ ] `magnet migrate:down --to <id>` rolls back to specific migration
- [ ] `magnet migrate:status` shows migration status table
- [ ] Config loader finds project configuration
- [ ] Exit codes are correct (0 success, 1 failure)
- [ ] Package builds successfully with tsup
- [ ] All tests pass
- [ ] No diagnostics errors

**Verify:**
- `cd packages/cli && bun test`
- `cd packages/cli && bun run build`
- `bun run check-types`

---

### Task 7: CLI: Generate, Create & Utility Commands

**Objective:** Add migration generation, empty template creation, reset, fresh, and --dry-run commands to the CLI.

**Dependencies:** Task 5, Task 6

**Files:**
- Create: `packages/cli/src/commands/migrate-generate.ts`
- Create: `packages/cli/src/commands/migrate-create.ts`
- Create: `packages/cli/src/commands/migrate-reset.ts`
- Create: `packages/cli/src/commands/migrate-fresh.ts`
- Modify: `packages/cli/src/index.ts` (register new commands)
- Test: `packages/cli/src/__tests__/migrate-generate.test.ts`
- Test: `packages/cli/src/__tests__/migrate-create.test.ts`

**Key Decisions / Notes:**
- `migrate:generate [name]`:
  - Load config, connect to database, run `SchemaBridge` + `SchemaDiff`
  - Generate migration file from diff result
  - If no changes detected, say so and exit
  - Display dangerous operation warnings
  - Show generated SQL in console
  - Accept `--dry-run` flag to only show SQL without writing file
- `migrate:create [name]`:
  - Generate an empty migration template file with sequential numbering
  - User fills in the `up` and `down` functions manually
- `migrate:reset`:
  - **Dangerous:** Drop all tables and rerun all migrations
  - Require `--force` flag or interactive confirmation prompt
  - Display "Are you sure?" with table list
- `migrate:fresh`:
  - Drop all tables, run all migrations from scratch
  - Similar to reset but drops tables directly (not via down migrations)
  - Also requires confirmation
- All commands support `--config <path>` to specify custom config path

**Definition of Done:**
- [ ] `magnet migrate:generate` produces migration file from schema diff
- [ ] `magnet migrate:generate --dry-run` shows SQL without writing
- [ ] `magnet migrate:create` produces empty migration template
- [ ] `magnet migrate:reset` drops and reruns with confirmation
- [ ] `magnet migrate:fresh` drops and runs fresh with confirmation
- [ ] `--force` bypasses confirmation prompts
- [ ] Dangerous operation warnings displayed for destructive migrations
- [ ] All tests pass
- [ ] No diagnostics errors

**Verify:**
- `cd packages/cli && bun test`
- `bun run check-types`

---

### Task 8: Auto-Migration Mode

**Objective:** Integrate the migration system with DrizzleAdapter's startup to auto-detect and apply schema changes in development mode.

**Dependencies:** Task 3, Task 5

**Files:**
- Modify: `packages/adapters/drizzle/src/drizzle.adapter.ts` (integrate migration runner)
- Create: `packages/adapters/drizzle/src/migrations/auto-migration.ts`
- Test: `packages/adapters/drizzle/src/migrations/__tests__/auto-migration.test.ts`

**Key Decisions / Notes:**
- `AutoMigration` class:
  - `run(db, schemaRegistry, config)` — check for changes, generate + apply in dev mode
  - In `auto` mode: run `SchemaDiff`, if changes found → `MigrationGenerator.generate()` → `MigrationRunner.up()`
  - In `manual` mode: run `SchemaDiff`, if changes found → log warning "N pending schema changes detected. Run `magnet migrate:generate` to create a migration."
  - If no `migrations` config: fall back to current `ensureTablesCreated()` behavior for backward compatibility
- Integration with `DrizzleAdapter`:
  - Modify `ensureTablesCreated()` to check `config.migrations`:
    - If `migrations` config exists: delegate to `AutoMigration.run()`
    - If no config: keep current `CREATE TABLE IF NOT EXISTS` behavior
  - This preserves backward compatibility — existing projects without migration config are unaffected
- Log all auto-applied migrations using the existing `Logger` (will be migrated to `MagnetLogger` later or already done)
- Auto-migration creates files in the configured `directory` — these should be committed to version control

**Definition of Done:**
- [ ] Auto-migration detects schema changes on startup in `auto` mode
- [ ] Auto-migration generates and applies migration files in `auto` mode
- [ ] Manual mode logs a warning about pending changes without applying
- [ ] No `migrations` config = backward-compatible `CREATE TABLE IF NOT EXISTS`
- [ ] Generated migration files are valid and could be applied by CLI too
- [ ] All tests pass
- [ ] No diagnostics errors

**Verify:**
- `cd packages/adapters/drizzle && bun test src/migrations/__tests__/auto-migration.test.ts`
- `bun run check-types`

---

### Task 9: create-magnet Integration

**Objective:** Update the `create-magnet` CLI to include migrations configuration and folder in scaffolded projects.

**Dependencies:** Task 1

**Files:**
- Modify: `packages/create-magnet/src/generators/index.ts` (add migrations folder)
- Modify: `packages/create-magnet/src/generators/app-module.ts` (add migrations config)
- Modify: `packages/create-magnet/src/generators/config-files.ts` (add migrations to .gitignore if needed)
- Modify: `packages/create-magnet/src/generators/package-json.ts` (add @magnet-cms/cli dependency)
- Test: `packages/create-magnet/src/__tests__/generators.test.ts` (if exists, otherwise create)

**Key Decisions / Notes:**
- Add `migrations/` directory to generated project structure (with `.gitkeep`)
- For Drizzle-based projects only (not Mongoose):
  - Add `migrations` config to `MagnetModule.forRoot()` in generated `app.module.ts`:
    ```typescript
    db: {
      connectionString: process.env.DATABASE_URL || '',
      dialect: 'postgresql',
      migrations: {
        mode: process.env.NODE_ENV === 'production' ? 'manual' : 'auto',
        directory: './migrations',
      },
    }
    ```
  - Add `@magnet-cms/cli` to generated `package.json` devDependencies
  - Add scripts: `"migrate:up": "magnet migrate:up"`, `"migrate:down": "magnet migrate:down"`, etc.
- Mongoose projects skip migration setup entirely
- Add `migrations/` to generated `.gitignore` comment section (migration files SHOULD be committed, but lock files shouldn't)

**Definition of Done:**
- [ ] Drizzle projects get `migrations/` directory with `.gitkeep`
- [ ] Generated `app.module.ts` includes migration config for Drizzle projects
- [ ] Generated `package.json` includes `@magnet-cms/cli` and migrate scripts for Drizzle projects
- [ ] Mongoose projects are unaffected
- [ ] All tests pass
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`
- Manual: `cd packages/create-magnet && bun run dev` and verify generated output

---

### Task 10: Unit Tests

**Objective:** Comprehensive unit test coverage for all migration components.

**Dependencies:** Tasks 1-5, 8

**Files:**
- Modify/Create: `packages/adapters/drizzle/src/migrations/__tests__/migration-runner.test.ts` (comprehensive tests)
- Modify/Create: `packages/adapters/drizzle/src/migrations/__tests__/migration-history.test.ts` (comprehensive tests)
- Modify/Create: `packages/adapters/drizzle/src/migrations/__tests__/migration-lock.test.ts` (comprehensive tests)
- Create: `packages/adapters/drizzle/src/migrations/__tests__/sql-generators.test.ts`
- Create: `packages/adapters/drizzle/src/migrations/__tests__/auto-migration.test.ts` (comprehensive tests)

**Key Decisions / Notes:**
- Mock database connections for all unit tests (no real database required)
- Test cases for MigrationRunner:
  - Applies pending migrations in order
  - Rolls back migrations in reverse order
  - Handles transaction failures (rolls back failed migration)
  - Respects migration lock
  - Validates checksums
  - `up({ to: 'id' })` stops at target
  - Empty pending list does nothing
- Test cases for SQL generators:
  - PostgreSQL: ADD COLUMN, DROP COLUMN, ALTER COLUMN TYPE, CREATE TABLE, DROP TABLE, CREATE INDEX
  - MySQL: same operations with MySQL syntax
  - SQLite: same operations with SQLite limitations (no ALTER COLUMN)
- Test cases for auto-migration:
  - Auto mode generates + applies
  - Manual mode warns only
  - No config = backward compatible
- Target ≥ 80% coverage

**Definition of Done:**
- [ ] All migration components have unit tests
- [ ] Runner tests cover success, failure, lock, checksum scenarios
- [ ] SQL generator tests verify correct dialect-specific SQL for all operations
- [ ] All tests pass
- [ ] Coverage ≥ 80%
- [ ] No diagnostics errors

**Verify:**
- `cd packages/adapters/drizzle && bun test src/migrations/__tests__/`

---

### Task 11: E2E Tests & Documentation

**Objective:** Add E2E tests for migration CLI commands and write comprehensive MDX documentation.

**Dependencies:** Tasks 6, 7

**Files:**
- Create: `apps/e2e/tests/api/migrations.spec.ts`
- Create: `apps/docs/content/docs/migrations/index.mdx`
- Create: `apps/docs/content/docs/migrations/configuration.mdx`
- Create: `apps/docs/content/docs/migrations/cli-commands.mdx`
- Create: `apps/docs/content/docs/migrations/migration-files.mdx`
- Create: `apps/docs/content/docs/migrations/best-practices.mdx`
- Modify: `apps/docs/content/docs/migrations/meta.json` (navigation)

**Key Decisions / Notes:**
- E2E tests split into two categories:
  - **CLI output tests** (no database): `migrate:status`, `migrate:create`, `migrate:generate --dry-run`
  - **Integration tests with SQLite in-memory** (zero infra, no docker required): Full up/down/locking workflow using SQLite `:memory:` database. This covers Goal Verification Truths 2, 3, and 7 without requiring PostgreSQL. SQLite in-memory is fast and disposable — ideal for CI.
  - Test `migrate:up` applies migrations and records in history
  - Test `migrate:down` rolls back and removes history
  - Test `migrate:status` shows applied vs pending
  - Test concurrent `migrate:up` respects lock
- Documentation structure:
  - `index.mdx`: Overview, why migrations matter, quick start
  - `configuration.mdx`: All config options, environment-based mode switching
  - `cli-commands.mdx`: Each command with examples and flags
  - `migration-files.mdx`: File format, up/down functions, dangerous operations
  - `best-practices.mdx`: When to use auto vs manual, team workflow, CI/CD integration, backup recommendations
- All docs include TypeScript code examples
- Follow existing docs pattern (see `apps/docs/content/docs/` for frontmatter style)

**Definition of Done:**
- [ ] CLI output tests verify dry-run, status, and create commands
- [ ] Integration tests with SQLite in-memory verify full up/down/locking workflow
- [ ] All 5 MDX documentation pages created with proper frontmatter
- [ ] Documentation includes code examples for each feature
- [ ] `meta.json` navigation updated
- [ ] All E2E tests pass
- [ ] No diagnostics errors

**Verify:**
- `bun run test:e2e --project=api` (if migration tests can run)
- `bun run check-types`
- `cd apps/docs && bun run build` (verify docs build)

---

## Open Questions

1. **drizzle-kit API stability:** The programmatic API may change between versions. Need to check exact API surface during implementation and pin to a compatible version.
2. **SQLite ALTER TABLE limitations:** SQLite doesn't support `DROP COLUMN` before version 3.35.0 or `ALTER COLUMN TYPE`. The SQLite generator may need to use the "recreate table" pattern for some operations.

## Deferred Ideas

- **Migration squashing:** Combine multiple migrations into one (useful for cleaning up development migrations before deploying)
- **Seed data system:** Post-migration data seeding for initial or test data
- **Admin UI panel:** Visual migration management in the admin dashboard
- **Multi-tenant migrations:** Per-tenant schema isolation and migration
- **Migration branching:** Handle divergent migration histories from different git branches
