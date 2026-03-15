# CLI Local Development Environment Generator — Implementation Plan

Created: 2026-03-15
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Enhance `create-magnet` CLI and `@magnet-cms/cli` so that scaffolded projects run with a single `npm run dev` — Docker services start, health checks pass, and the NestJS app launches automatically.

**Architecture:** The existing `docker/docker-compose.yml` generator gets upgraded with auth credentials, admin UIs (pgAdmin/Mongo Express), and configurable ports. A working `.env` file is generated alongside `.env.example`. Dev orchestration logic (`magnet dev`, `magnet docker:*`, `magnet db:reset`) lives in `@magnet-cms/cli` — user projects only have thin npm scripts that invoke `magnet` commands. The CLI is decoupled from `@magnet-cms/adapter-db-drizzle` (lazy-loaded) so it works for all database adapters including Mongoose.

**Tech Stack:** Commander (CLI), child_process (Docker orchestration), @inquirer/prompts (Supabase prompt), existing generator pattern (string templates)

## Scope

### In Scope

- Enhanced Docker Compose templates with auth, admin UIs, health checks, configurable ports
- Supabase local dev sub-prompt (Supabase CLI vs raw Postgres)
- Working `.env` generation with Docker-matching credentials
- `magnet dev` command (Docker up → health wait → app start)
- `magnet docker:up/down/logs` commands
- `magnet db:reset` command (volumes down → up → health wait)
- CLI decoupled from Drizzle (lazy-load migration imports)
- `@magnet-cms/cli` added as devDependency for ALL project types
- Updated npm scripts, README, and success message

### Out of Scope

- MySQL and SQLite database adapters (current `DatabaseAdapter` type unchanged)
- Multi-environment configuration (dev/staging/prod compose files)
- Vault/secrets integration
- Plugin-specific Docker services
- Windows PowerShell script generation (WSL recommended)
- Turbo integration for the monorepo dev command

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:** Generator functions return string content → collected in `GeneratedFile[]` array → written to disk. See `packages/create-magnet/src/generators/index.ts:25-90` for the pattern. Each generator is a pure function taking `ProjectConfig` and returning a string.
- **Conventions:** All string templates use template literals (no Handlebars/Mustache). Tabs for indentation. Single quotes in generated code. Biome enforces style.
- **Key files:**
  - `packages/create-magnet/src/types.ts` — `ProjectConfig` interface, `DatabaseAdapter` type
  - `packages/create-magnet/src/prompts.ts` — Interactive CLI prompts (uses `@inquirer/prompts`)
  - `packages/create-magnet/src/generators/docker.ts` — Current Docker Compose generator
  - `packages/create-magnet/src/generators/config-files.ts` — `.env.example`, `.gitignore`, README generators
  - `packages/create-magnet/src/generators/package-json.ts` — `package.json` generator with scripts
  - `packages/create-magnet/src/generators/index.ts` — Orchestrates all generators, writes files
  - `packages/create-magnet/src/ui/messages.ts` — Post-scaffold success message
  - `packages/cli/src/index.ts` — CLI entry point (Commander), currently only migration commands
  - `packages/cli/src/utils/config-loader.ts` — `ConfigLoader` class, reads `magnet.config.ts` or env vars
- **Gotchas:**
  - `@magnet-cms/cli` has a hard dependency on `@magnet-cms/adapter-db-drizzle` (workspace:*) — top-level imports in `cli/src/index.ts:1-3`. Must be refactored to lazy imports before CLI can work for Mongoose projects.
  - Currently Mongoose projects don't include `@magnet-cms/cli` at all (`package-json.ts:100`).
  - The Docker compose file path convention is `docker/docker-compose.yml` (not project root).
  - `generateEnvExample()` in `config-files.ts:103` generates placeholder values — the new `generateDotEnv()` must generate matching values with the Docker compose credentials.
  - **Pre-existing bug:** `package-json.ts:92-96` generates `magnet migrate:up` (colon) but CLI uses Commander subcommands requiring `magnet migrate up` (space). Must be fixed in Task 6.
- **Domain context:** The CLI has two packages: `create-magnet` (scaffolding, runs once to create a project) and `@magnet-cms/cli` (runtime CLI, used during development via `magnet` binary). The scaffolder generates the project; the CLI provides ongoing dev tools.

## Runtime Environment

- **Start command:** `bun run dev` (monorepo), `bun test` (tests in each package)
- **Port:** N/A (CLI tool, not a server)
- **Health check:** `bun run check-types` + `bun run lint`
- **Test command:** `cd packages/create-magnet && bun test` / `cd packages/cli && bun test`

## Assumptions

- Docker Compose V2 (`docker compose` not `docker-compose`) is the target — supported by [finding: all existing scripts use `docker compose`] — Tasks 1, 4, 5 depend on this
- The `nest start --watch` command is universally available in scaffolded projects (NestJS CLI is always a devDep) — Task 5 depends on this
- `child_process.spawn/exec` is acceptable for Docker operations in the CLI — Tasks 4, 5 depend on this
- Admin UIs (pgAdmin/Mongo Express) add acceptable overhead for development — Task 1 depends on this
- Supabase CLI is installed separately by the user when choosing the Supabase CLI local option — Task 2 depends on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Docker not installed on user's machine | Medium | High | `magnet dev` detects Docker absence, prints install instructions, falls back to `nest start --watch` without Docker |
| Port conflicts (27017, 5432, 8081, 5050) | Medium | Medium | Use env var overrides in compose: `${MONGO_PORT:-27017}`. Document in `.env.example` comments |
| Lazy-loading drizzle breaks existing migration commands | Low | High | Thorough tests for migration commands after refactor. Fallback: register migration commands only when drizzle adapter is importable |
| Supabase CLI not installed when user picks CLI option | Medium | Low | Check for `supabase` binary at runtime, print install instructions if missing |

## Goal Verification

### Truths

1. A scaffolded Mongoose project runs `npm run dev` and gets: MongoDB container started, health check passed, NestJS app running — with zero manual configuration
2. A scaffolded Drizzle-Neon project runs `npm run dev` and gets: Postgres container started, health check passed, NestJS app running
3. A scaffolded Drizzle-Supabase project with "raw Postgres" option runs `npm run dev` and gets: Postgres container started, NestJS app running
4. The generated `.env` file has working credentials that match the Docker Compose service configuration
5. `npm run db:reset` tears down volumes, recreates containers, and the app can connect to a fresh database
6. Admin UIs (Mongo Express on 8081, pgAdmin on 5050) are accessible after `npm run docker:up`
7. `magnet dev` gracefully handles Docker not being installed (prints message, starts app anyway)

### Artifacts

1. `packages/create-magnet/src/generators/docker.ts` — Enhanced Docker Compose templates
2. `packages/create-magnet/src/generators/config-files.ts` — Working `.env` generator
3. `packages/cli/src/commands/dev.ts` — Dev orchestration command
4. `packages/cli/src/commands/docker.ts` — Docker Compose wrapper commands
5. `packages/cli/src/commands/db-reset.ts` — Database reset command
6. `packages/cli/src/utils/docker.ts` — Docker detection and health check utilities

## Progress Tracking

- [x] Task 1: Enhance Docker Compose Templates
- [x] Task 2: Add Supabase Local Dev Prompt
- [x] Task 3: Generate Working .env File
- [x] Task 4: Decouple CLI from Drizzle Adapter
- [x] Task 5: Add Dev/Docker/Reset CLI Commands
- [x] Task 6: Update Package.json, README, and Success Message

**Total Tasks:** 6 | **Completed:** 6 | **Remaining:** 0

## Implementation Tasks

### Task 1: Enhance Docker Compose Templates

**Objective:** Upgrade the existing Docker Compose generator to include authentication credentials, database admin UIs, and configurable ports for all adapter types.

**Dependencies:** None

**Files:**

- Modify: `packages/create-magnet/src/generators/docker.ts`
- Test: `packages/create-magnet/src/__tests__/docker.test.ts` (new)

**Key Decisions / Notes:**

- Follow existing pattern: pure function returning string content (`docker.ts:3-12`)
- Mongo compose gets: `MONGO_INITDB_ROOT_USERNAME=magnet`, `MONGO_INITDB_ROOT_PASSWORD=magnet`, Mongo Express container on port 8081
- Postgres compose gets: `POSTGRES_USER=magnet`, `POSTGRES_PASSWORD=magnet` (currently `postgres`/`postgres`), pgAdmin container on port 5050
- All ports use env var overrides: `"${MONGO_PORT:-27017}:27017"`
- Container names use sanitized project name (existing pattern at `docker.ts:15`)
- Both Mongo and Postgres already have health checks (keep and verify)

**Definition of Done:**

- [ ] Mongoose compose includes Mongo Express with health check
- [ ] Postgres compose includes pgAdmin with default credentials
- [ ] All service ports are configurable via env vars
- [ ] Auth credentials use `magnet`/`magnet` instead of `postgres`/`postgres`
- [ ] Generated YAML is valid Docker Compose V2
- [ ] Tests verify compose output for each adapter type

**Verify:**

- `cd packages/create-magnet && bun test`

---

### Task 2: Add Supabase Local Dev Prompt

**Objective:** When database is `drizzle-supabase`, ask whether to use Supabase CLI or raw Postgres for local development. Generate the appropriate Docker/config based on choice.

**Dependencies:** Task 1

**Files:**

- Modify: `packages/create-magnet/src/types.ts`
- Modify: `packages/create-magnet/src/prompts.ts`
- Modify: `packages/create-magnet/src/generators/docker.ts`
- Test: `packages/create-magnet/src/__tests__/generators.test.ts` (extend existing)

**Key Decisions / Notes:**

- Add `supabaseLocalMode?: 'cli' | 'postgres'` to `ProjectConfig` — optional, only set when `database === 'drizzle-supabase'`
- Prompt appears right after database selection in `collectConfig()` (`prompts.ts:32`)
- When `'cli'`: skip Docker Compose for DB, generate `supabase/config.toml` with project defaults, add note in README about `supabase start`
- When `'postgres'`: generate standard Postgres Docker Compose (same as drizzle-neon but with Supabase env vars in `.env`)
- Default selection: `'postgres'` (simpler, no extra CLI dependency)

**Definition of Done:**

- [ ] `ProjectConfig` has optional `supabaseLocalMode` field
- [ ] Sub-prompt appears only when `database === 'drizzle-supabase'`
- [ ] `'postgres'` mode generates standard Postgres compose
- [ ] `'cli'` mode generates `supabase/config.toml` instead of Docker Compose
- [ ] Integration test runs full generator pipeline for supabase-cli mode and asserts `supabase/config.toml` exists at correct path (use temp directory)
- [ ] Tests cover both modes

**Verify:**

- `cd packages/create-magnet && bun test`

---

### Task 3: Generate Working .env File

**Objective:** Generate a `.env` file with working local Docker credentials alongside the existing `.env.example`, so the project connects to Docker services out of the box.

**Dependencies:** Task 1 (credentials must match compose)

**Files:**

- Modify: `packages/create-magnet/src/generators/config-files.ts`
- Modify: `packages/create-magnet/src/generators/index.ts`
- Test: `packages/create-magnet/src/__tests__/env.test.ts` (new)

**Key Decisions / Notes:**

- Add `generateDotEnv(config: ProjectConfig): string` to `config-files.ts`, following `generateEnvExample()` pattern at line 103
- Mongoose `.env`: `MONGODB_URI=mongodb://magnet:magnet@localhost:27017/magnet` (matches compose credentials)
- Drizzle-Neon `.env`: `DATABASE_URL=postgresql://magnet:magnet@localhost:5432/<projectName>` (local Postgres)
- Drizzle-Supabase (postgres mode): same as Neon plus `SUPABASE_URL`, `SUPABASE_ANON_KEY` placeholders
- Include `JWT_SECRET=magnet-local-dev-secret-change-in-production`, `PORT=3000`, `NODE_ENV=development`
- Add to generated files list in `index.ts:32` as `{ path: '.env', content: generateDotEnv(config) }`
- `.gitignore` already excludes `.env` (`config-files.ts:169`)
- Vault `VAULT_MASTER_KEY` gets a dev-only random hex value — this is intentionally not idempotent (each scaffold generates a unique key). Add comment in generated `.env`: `# VAULT_MASTER_KEY: generated at scaffold time — do not regenerate without re-encrypting vault data`

**Definition of Done:**

- [ ] `generateDotEnv()` produces working values matching Docker Compose credentials
- [ ] `.env` is included in generated project files
- [ ] All three adapter types produce correct connection strings
- [ ] JWT_SECRET, PORT, NODE_ENV are included
- [ ] VAULT_MASTER_KEY has warning comment about idempotency
- [ ] Comments explain values are for local Docker dev
- [ ] Tests verify credential matching between `.env` and Docker Compose

**Verify:**

- `cd packages/create-magnet && bun test`

---

### Task 4: Decouple CLI from Drizzle Adapter

**Objective:** Make `@magnet-cms/cli` work for all database adapters by moving the Drizzle dependency to a peer/optional dependency and lazy-loading it only when migration commands are invoked.

**Dependencies:** None (can be done in parallel with Tasks 1-3)

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/cli/src/index.ts`
- Test: `packages/cli/src/__tests__/cli-startup.test.ts` (new)

**Key Decisions / Notes:**

- Move `@magnet-cms/adapter-db-drizzle` from `dependencies` to `peerDependencies` with optional flag in `peerDependenciesMeta`
- Remove top-level imports of drizzle adapter in `index.ts:1-3` — instead, wrap the entire `migrate` command group registration in an async function that dynamically imports
- Pattern: `try { const drizzle = await import('@magnet-cms/adapter-db-drizzle'); registerMigrateCommands(program, drizzle); } catch { /* drizzle not installed, migration commands not available */ }`
- **TypeScript type safety:** Use `import type { MigrationRunner, ... } from '@magnet-cms/adapter-db-drizzle'` for compile-time types (erased at runtime, no dependency). Define a `DrizzleModule` interface or use the type-only import pattern to keep `registerMigrateCommands()` fully typed without `any`. Never use `any` for the dynamic import result — the project's no-any convention is mandatory.
- Non-migration commands (dev, docker, db:reset) have zero drizzle dependency
- All existing migration tests must still pass

**Definition of Done:**

- [ ] `@magnet-cms/adapter-db-drizzle` is a peer dependency with `optional: true`
- [ ] `peerDependenciesMeta` has `{ "@magnet-cms/adapter-db-drizzle": { "optional": true } }` in `package.json`
- [ ] CLI starts without error when drizzle adapter is not installed
- [ ] Migration commands still work when drizzle adapter IS installed
- [ ] Dynamic import is fully typed (no `any` — use `import type` for compile-time types)
- [ ] All existing migration tests pass
- [ ] `bun run check-types` passes for the CLI package

**Verify:**

- `cd packages/cli && bun test`
- `bun run check-types`

---

### Task 5: Add Dev/Docker/Reset CLI Commands

**Objective:** Add `magnet dev`, `magnet docker:up/down/logs`, and `magnet db:reset` commands to the CLI for cross-adapter dev orchestration.

**Dependencies:** Task 4 (CLI must work without drizzle)

**Files:**

- Create: `packages/cli/src/commands/dev.ts`
- Create: `packages/cli/src/commands/docker.ts`
- Create: `packages/cli/src/commands/db-reset.ts`
- Create: `packages/cli/src/utils/docker.ts`
- Modify: `packages/cli/src/index.ts`
- Test: `packages/cli/src/__tests__/dev.test.ts` (new)
- Test: `packages/cli/src/__tests__/docker-utils.test.ts` (new)

**Key Decisions / Notes:**

- `packages/cli/src/utils/docker.ts` provides shared utilities:
  - `isDockerAvailable(): Promise<boolean>` — runs `docker --version`, returns true/false
  - `findComposeFile(cwd: string): string | null` — looks for `docker/docker-compose.yml`
  - `waitForHealthy(composeFile: string, timeout: number): Promise<void>` — polls `docker compose ps --format json` for healthy status
- `magnet dev` flow:
  1. Check Docker available → if not, warn and skip to step 4
  2. Find compose file → if not found, warn and skip to step 4
  3. Run `docker compose -f <file> up -d`, wait for healthy (30s timeout)
  4. Spawn `nest start --watch` with inherited stdio (user sees NestJS output)
  5. On SIGINT: forward to nest process, print "Stopping..." (Docker containers left running)
- **Health check scope:** `waitForHealthy` only waits for the primary DB service container (the service with a `healthcheck` defined, e.g., `mongodb` or `postgres`) — NOT admin UI containers (pgAdmin, Mongo Express). Admin UIs may take longer to start and should not block app startup. Poll specifically for the DB service by parsing `docker compose ps --format json` and checking the DB service name.
- `magnet docker:up` — `docker compose -f <file> up -d`
- `magnet docker:down` — `docker compose -f <file> down` (add `--volumes` flag option)
- `magnet docker:logs` — `docker compose -f <file> logs -f`
- `magnet db:reset` — `docker compose down -v` → `docker compose up -d` → wait healthy → print success. Add `--force` flag to skip confirmation.
- All commands use `child_process.spawn` for streaming output, `child_process.exec` for status checks
- Compose file path is convention-based: `docker/docker-compose.yml` relative to CWD

**Definition of Done:**

- [ ] `magnet dev` starts Docker containers and NestJS app in one command
- [ ] `magnet dev` gracefully handles missing Docker (warns, starts app anyway)
- [ ] `magnet dev` gracefully handles missing compose file (warns, starts app anyway)
- [ ] `magnet docker:up/down/logs` wrap compose commands
- [ ] `magnet db:reset` tears down volumes and recreates containers
- [ ] Health check waits only for primary DB service, not admin UI containers
- [ ] All commands registered in CLI entry point
- [ ] Tests cover Docker detection, health check, and command execution (mocked child_process)

**Verify:**

- `cd packages/cli && bun test`
- `bun run check-types`

---

### Task 6: Update Package.json, README, and Success Message

**Objective:** Wire up the new CLI commands in generated project's `package.json` scripts, update the README to reflect the new workflow, and update the post-scaffold success message.

**Dependencies:** Task 5 (CLI commands must exist)

**Files:**

- Modify: `packages/create-magnet/src/generators/package-json.ts`
- Modify: `packages/create-magnet/src/generators/config-files.ts` (README section)
- Modify: `packages/create-magnet/src/ui/messages.ts`
- Test: `packages/create-magnet/src/__tests__/generators.test.ts` (extend existing)

**Key Decisions / Notes:**

- **Package.json changes:**
  - Add `@magnet-cms/cli` to `devDependencies` for ALL projects (remove the `database !== 'mongoose'` guard at `package-json.ts:100`)
  - **Fix pre-existing bug:** Change `'magnet migrate:up'` → `'magnet migrate up'`, `'magnet migrate:down'` → `'magnet migrate down'`, etc. (lines 92-96). Commander uses space-separated subcommands, not colons.
  - Update scripts:
    - `"dev": "magnet dev"` (was `"nest start --watch"`)
    - `"dev:app": "nest start --watch"` (direct app start without Docker)
    - `"docker:up": "magnet docker:up"` (was `"docker compose -f docker/docker-compose.yml up -d"`)
    - `"docker:down": "magnet docker:down"` (was `"docker compose -f docker/docker-compose.yml down"`)
    - `"docker:logs": "magnet docker:logs"` (was `"docker compose -f docker/docker-compose.yml logs -f"`)
    - `"db:reset": "magnet db:reset"` (new)
  - Keep `build`, `start`, `start:prod`, `dev:debug` unchanged
- **README changes:** Update "Getting Started" section — remove manual `cp .env.example .env` step (`.env` is generated), simplify to just `npm install` → `npm run dev`. Mention Docker requirement. List admin UI URLs.
- **Success message:** Update next steps to: `cd <project>` → `npm run dev` (two steps instead of four). Note admin UI access.

**Definition of Done:**

- [ ] `@magnet-cms/cli` is a devDependency for mongoose projects too
- [ ] `"dev"` script runs `magnet dev` (not `nest start --watch`)
- [ ] `"db:reset"` script is present for all project types
- [ ] README "Getting Started" is a 2-step process: install → dev
- [ ] Success message shows simplified next steps
- [ ] Migrate scripts use space-separated format (`magnet migrate up` not `magnet migrate:up`)
- [ ] All existing generator tests still pass
- [ ] New tests verify updated scripts and CLI inclusion

**Verify:**

- `cd packages/create-magnet && bun test`
- `bun run check-types`

---

## Open Questions

None — all decisions resolved during planning.

### Deferred Ideas

- **MySQL/SQLite adapters:** Extend `DatabaseAdapter` type when adapters are built
- **`magnet dev --profile staging`:** Multi-environment compose files
- **`magnet seed`:** Database seeding command after db:reset
- **Windows PowerShell:** Generate `.ps1` scripts as alternative to Docker Compose (low priority — WSL covers most cases)
- **Turbo integration:** Root-level `turbo.json` orchestration for monorepo setups
