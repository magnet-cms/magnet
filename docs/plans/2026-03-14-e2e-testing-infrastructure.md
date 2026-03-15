# E2E Testing Infrastructure Implementation Plan

Created: 2026-03-14
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: Yes
Type: Feature

## Summary

**Goal:** Build Docker-based E2E testing infrastructure that spins up real databases and services, runs Magnet CMS with multiple adapter combinations across 3 example apps, and tests every scenario through the Admin UI and API. Add GitHub Actions CI workflow for automated E2E testing on every PR.

**Architecture:** Enhance the existing 3 example apps (mongoose, drizzle-neon, drizzle-supabase) to each use a different combination of adapters, backed by per-example Docker Compose files with real services (MongoDB, PostgreSQL, MinIO, HashiCorp Vault, MailPit, Supabase stack). The existing E2E framework (Playwright + fixtures + API client) is extended with adapter-specific test suites and template-aware orchestration.

**Tech Stack:** Docker Compose, Playwright, MinIO (S3-compatible), MailPit (SMTP testing), HashiCorp Vault, Supabase self-hosted stack, GitHub Actions

## Scope

### In Scope
- Enhance all 3 example apps with maximum adapter diversity (see Adapter Matrix below)
- Docker Compose files with real services for each example
- E2E test suites for storage, vault, email, and cross-adapter scenarios
- Template-aware test orchestration (run all tests against each example)
- GitHub Actions workflow with Docker services for CI
- MailPit integration for email delivery verification
- MinIO for S3-compatible storage testing
- Admin UI E2E tests for all adapter-related pages

### Out of Scope
- Clerk auth adapter (requires external service, no local Docker option)
- R2 storage adapter (S3-compatible, covered by MinIO/S3 tests)
- Resend email adapter (requires API key, covered by Nodemailer tests)
- Supabase Vault adapter (covered by DB vault + HashiCorp; Supabase stack doesn't expose Vault extension easily)
- Performance/load testing
- Documentation updates (deferred to separate task)

### Adapter Matrix

| Adapter   | mongoose          | drizzle-neon      | drizzle-supabase       |
|-----------|-------------------|-------------------|------------------------|
| DB        | Mongoose (MongoDB) | Drizzle/pg        | Drizzle/Supabase pg    |
| Auth      | JWT (built-in)    | JWT (built-in)    | Supabase Auth          |
| Storage   | Local             | S3 (MinIO)        | Supabase Storage       |
| Vault     | HashiCorp         | DB (built-in)     | DB (built-in)          |
| Email     | Nodemailer (MailPit) | Nodemailer (MailPit) | Console (built-in)  |
| Plugins   | Content Builder   | Content Builder       | Content Builder       |
| Admin UI  | Yes               | Yes               | Yes                    |

**Coverage:** 2/2 DB adapters, 2/3 auth strategies, 3/4 storage adapters, 2/3 vault adapters, 2/2 email adapters, 2/2 plugins

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - Example app module config: `apps/examples/mongoose/src/app.module.ts:10-33` — shows `MagnetModule.forRoot()` pattern with DB, JWT, vault, and plugin config
  - Supabase auth registration: `apps/examples/drizzle-supabase/src/app.module.ts:14` — `AuthStrategyFactory.registerStrategy()` must be called before module init
  - Docker Compose: `apps/examples/mongoose/docker/docker-compose.yml` — existing pattern with healthchecks and init containers
  - E2E fixtures: `apps/e2e/src/fixtures/auth.fixture.ts` — Playwright test extension pattern with custom fixtures
  - API client: `apps/e2e/src/helpers/api-client.ts` — centralized API helper with auth token management
  - Docker manager: `apps/e2e/scripts/docker-manager.ts` — orchestrates Docker per-template with health checks
  - Test runner: `apps/e2e/scripts/test-all-templates-robust.ts` — runs tests for all templates sequentially with retry

- **Conventions:**
  - `setDatabaseAdapter('drizzle')` must be called BEFORE any schema imports in Drizzle examples
  - Package names: DB adapters = `@magnet-cms/adapter-db-*`, auth = `@magnet-cms/adapter-auth-*`, storage = `@magnet-cms/adapter-storage-*`, email = `@magnet-cms/email-*`
  - Docker container names follow `<example>-<service>` pattern (e.g., `mongoose-mongodb`, `drizzle-neon-postgres`)
  - E2E tests use `TEMPLATE_NAME` env var to conditionally skip template-specific tests
  - Biome for linting/formatting, TypeScript strict mode, no `any` types

- **Key files:**
  - `packages/common/src/types/config.types.ts` — `MagnetModuleOptions` class with all config fields (db, jwt, auth, storage, email, vault, plugins, admin, rbac)
  - `packages/common/src/types/storage.types.ts` — `StorageConfig` interface with adapter: `'local' | 's3' | 'r2' | 'supabase'`
  - `packages/common/src/types/vault.types.ts` — `VaultConfig` interface with adapter: `'db' | 'hashicorp' | 'supabase'`
  - `packages/common/src/types/email.types.ts` — `EmailConfig` interface with adapter: `'nodemailer' | 'resend'`
  - `packages/core/src/modules/vault/vault.controller.ts` — REST API: GET/POST/DELETE `/vault/secrets/:key`, GET `/vault/status`
  - `packages/core/src/modules/notification/notification.controller.ts` — POST `/notifications` to trigger email sends

- **Gotchas:**
  - The drizzle-neon example uses port 5433 (not 5432) to avoid conflicts with drizzle-supabase
  - Supabase Docker stack is heavy (8+ containers) and needs 45s+ startup time
  - MailPit SMTP is on port 1025, web UI/API on port 8025
  - MinIO needs bucket creation after startup (use `mc` client or init container)
  - `ConsoleEmailAdapter` always wraps the real adapter — even when `nodemailer` is configured, logs are still printed
  - Docker container names must not conflict across examples when running tests sequentially

- **Domain context:**
  - Vault stores encrypted secrets (DB credentials, API keys) — the DB adapter uses `VAULT_MASTER_KEY` env var for AES-256-GCM encryption
  - HashiCorp Vault runs in dev mode for testing (single unseal key, in-memory storage)
  - The email system has a verification flow: register → verification email → GET `/email/verify?token=...`
  - Admin UI is served at `/admin` when `admin: true` is set — the E2E `admin-serve` project tests this

## Runtime Environment

- **Start command:** `bun run dev` in each example app dir (NestJS watch mode), `bun run dev` in `packages/client/admin` (Vite dev server)
- **API Port:** 3000 (all examples)
- **Admin UI Port:** 3001 (Vite dev server) or served at `/admin` on port 3000 (admin-serve mode)
- **Health check:** GET `/health` returns `{ status: 'ok' }`
- **Restart:** Kill NestJS process, `bun run dev` again

## Assumptions

- MinIO is S3-API-compatible and the `@magnet-cms/adapter-storage-s3` adapter works with it via custom `endpoint` + `forcePathStyle` config — supported by `S3StorageConfig.endpoint` field. Tasks 2, 4 depend on this.
- MailPit accepts SMTP on port 1025 without authentication and exposes a REST API at port 8025 for querying received messages — supported by MailPit docs. Tasks 1, 2, 3, 6, 9 depend on this.
- HashiCorp Vault dev mode accepts the `dev-token` token without any setup — already verified in existing `mongoose/docker/docker-compose.yml`. Tasks 1, 3, 8 depend on this.
- The Supabase self-hosted Docker stack's storage API works with the `@magnet-cms/adapter-storage-supabase` adapter — supported by existing config in drizzle-supabase example. Tasks 5 depend on this.
- GitHub Actions supports Docker Compose in `ubuntu-latest` runners — well-documented in Actions docs. Task 11 depends on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Supabase Docker stack startup exceeds CI timeout | Medium | High | Set 5-minute timeout for Supabase stack; add retry logic in docker-manager; run Supabase tests last |
| MinIO bucket creation race condition | Low | Medium | Use init container that waits for MinIO health before creating bucket |
| Port conflicts between examples when tests overlap | Low | High | Run examples sequentially (existing pattern); use unique port ranges per example |
| CI runner disk space with multiple Docker images | Medium | Medium | Pull images in parallel job; use Docker layer caching via `actions/cache` |
| S3 adapter incompatibility with MinIO | Low | High | Test MinIO locally first; MinIO is widely used for S3 testing |

## Goal Verification

### Truths
1. Running `bun run test:all --example=mongoose` starts MongoDB + Vault + MailPit in Docker, boots the CMS with all configured adapters, runs all E2E tests, and reports pass/fail
2. Running `bun run test:all --example=drizzle-neon` starts PostgreSQL + MinIO + MailPit in Docker, boots the CMS with S3 storage, and all storage E2E tests pass (upload, download, delete)
3. Running `bun run test:all --example=drizzle-supabase` starts the full Supabase stack, boots the CMS with Supabase auth + storage, and all auth + storage tests pass
4. Running `bun run test:all` (no argument) tests all 3 examples sequentially and produces a combined pass/fail report
5. The GitHub Actions workflow triggers on PR, runs all 3 example E2E suites, and reports results
6. Vault E2E tests store a secret, retrieve it, verify the value, and delete it — passing against both HashiCorp Vault (mongoose) and DB vault (drizzle-neon)
7. Email E2E tests trigger an action that sends email (e.g., notification), then verify delivery via MailPit REST API
8. Admin UI E2E tests can navigate to vault, media, and settings pages, perform CRUD operations via the browser, and verify results

### Artifacts
- `apps/examples/mongoose/docker/docker-compose.yml` — includes MongoDB + Vault + MailPit services
- `apps/examples/drizzle-neon/docker/docker-compose.yml` — includes PostgreSQL + MinIO + MailPit services
- `apps/examples/mongoose/src/app.module.ts` — configures all adapters (DB, vault, email, admin, plugins)
- `apps/examples/drizzle-neon/src/app.module.ts` — configures S3 storage, email, SEO plugin, admin
- `apps/examples/drizzle-supabase/src/app.module.ts` — configures Supabase storage, both plugins, admin
- `apps/e2e/tests/api/storage.spec.ts` — storage adapter E2E tests
- `apps/e2e/tests/api/vault.spec.ts` — vault adapter E2E tests
- `apps/e2e/tests/api/email.spec.ts` — email delivery E2E tests
- `apps/e2e/src/helpers/mailpit-client.ts` — MailPit REST API helper
- `apps/e2e/tests/ui/vault.spec.ts` — vault Admin UI E2E tests
- `apps/e2e/tests/ui/storage-upload.spec.ts` — storage upload Admin UI E2E tests
- `.github/workflows/e2e.yml` — CI workflow for E2E tests

## Progress Tracking

- [x] Task 1: Docker Compose — mongoose example enhancements
- [x] Task 2: Docker Compose — drizzle-neon example enhancements
- [x] Task 3: Mongoose example adapter integration
- [x] Task 4: Drizzle-neon example adapter integration
- [x] Task 5: Drizzle-supabase example adapter integration
- [x] Task 6: E2E testing helpers (MailPit client, MinIO setup)
- [x] Task 7: E2E test orchestration updates
- [x] Task 8: Vault E2E test suite
- [x] Task 9: Email E2E test suite
- [x] Task 10: Storage E2E test suite
- [x] Task 11: GitHub Actions E2E workflow
- [x] Task 12: Admin UI E2E tests for adapter pages

**Total Tasks:** 12 | **Completed:** 12 | **Remaining:** 0

## Implementation Tasks

### Task 1: Docker Compose — mongoose example enhancements

**Objective:** Add MailPit SMTP service to the mongoose Docker Compose file. HashiCorp Vault and vault-init are already present.

**Dependencies:** None

**Files:**
- Modify: `apps/examples/mongoose/docker/docker-compose.yml`
- Modify: `apps/examples/mongoose/.env.example`

**Key Decisions / Notes:**
- Add MailPit container (axllent/mailpit:latest) with ports 1025 (SMTP) and 8025 (Web UI/API)
- Add healthcheck for MailPit
- Follow existing container naming: `mongoose-mailpit`
- Update `.env.example` with email config vars (SMTP_HOST, SMTP_PORT, EMAIL_FROM)

**Definition of Done:**
- [ ] `docker compose -f apps/examples/mongoose/docker/docker-compose.yml up -d` starts MongoDB + Vault + MailPit
- [ ] MailPit responds at http://localhost:8025 after startup
- [ ] `.env.example` includes all new env vars with sensible defaults

**Verify:**
- `docker compose -f apps/examples/mongoose/docker/docker-compose.yml up -d && sleep 5 && curl -s http://localhost:8025/api/v1/messages | head -c 100`

---

### Task 2: Docker Compose — drizzle-neon example enhancements

**Objective:** Add MinIO (S3-compatible) and MailPit services to the drizzle-neon Docker Compose. Add a MinIO init container that creates the test bucket.

**Dependencies:** None

**Files:**
- Modify: `apps/examples/drizzle-neon/docker/docker-compose.yml`
- Modify: `apps/examples/drizzle-neon/.env.example`

**Key Decisions / Notes:**
- Add MinIO container (minio/minio:latest) with ports 9000 (S3 API) and 9001 (Console)
- Add minio-init container using `minio/mc:latest` to create the `magnet-media` bucket
- minio-init depends on MinIO health, runs `mc alias set local http://minio:9000 minioadmin minioadmin && mc mb local/magnet-media --ignore-existing`
- Add MailPit container on ports 1025/8025
- Container names: `drizzle-neon-minio`, `drizzle-neon-minio-init`, `drizzle-neon-mailpit`
- Use port 9000/9001 for MinIO (no conflict with other examples since they run sequentially)
- Update `.env.example` with S3/MinIO vars and email vars

**Definition of Done:**
- [ ] `docker compose up -d` starts PostgreSQL + MinIO + MailPit
- [ ] MinIO bucket `magnet-media` exists after init container completes
- [ ] MinIO S3 API responds at http://localhost:9000
- [ ] MailPit responds at http://localhost:8025

**Verify:**
- `docker compose -f apps/examples/drizzle-neon/docker/docker-compose.yml up -d && sleep 10 && curl -s http://localhost:9000/minio/health/live`

---

### Task 3: Mongoose example adapter integration

**Objective:** Update the mongoose example app to use the full adapter matrix: Mongoose DB + JWT auth + local storage + HashiCorp Vault + Nodemailer email (MailPit) + Content Builder plugin + admin UI.

**Dependencies:** Task 1 (Docker services available)

**Files:**
- Modify: `apps/examples/mongoose/src/app.module.ts`
- Modify: `apps/examples/mongoose/package.json`
- Modify: `apps/examples/mongoose/.env.example`

**Key Decisions / Notes:**
- The app already has: Mongoose DB, JWT auth, vault=db, ContentBuilder plugin
- Add to `MagnetModule.forRoot()`:
  - `vault: { adapter: 'hashicorp', hashicorp: { url: process.env.VAULT_ADDR || 'http://localhost:8200' } }` (change from `'db'` to `'hashicorp'`)
  - `email: { adapter: 'nodemailer', nodemailer: { host: process.env.SMTP_HOST || 'localhost', port: Number(process.env.SMTP_PORT || 1025), secure: false, auth: { user: '', pass: '' } }, defaults: { from: process.env.EMAIL_FROM || 'noreply@magnet.local' } }`
  - `admin: true`
  - `storage: { adapter: 'local', local: { uploadDir: './uploads', publicPath: '/media' } }` (explicit, was implicit before)
- Add `@magnet-cms/email-nodemailer` to package.json dependencies
- Set `VAULT_TOKEN=dev-token` in env (for HashiCorp Vault dev mode)

**Definition of Done:**
- [ ] App starts successfully with `bun run dev` (after Docker services are up)
- [ ] `GET /health` returns 200
- [ ] `GET /vault/status` returns `{ healthy: true, adapter: 'hashicorp' }`
- [ ] Admin UI is accessible at `/admin`
- [ ] `bun run check-types` passes in the example directory

**Verify:**
- `cd apps/examples/mongoose && bun run check-types`

---

### Task 4: Drizzle-neon example adapter integration

**Objective:** Update drizzle-neon example to use: Drizzle/pg DB + JWT auth + S3 storage (MinIO) + DB vault + Nodemailer email (MailPit) + Content Builder + SEO plugins + admin UI.

**Dependencies:** Task 2 (Docker services available)

**Files:**
- Modify: `apps/examples/drizzle-neon/src/app.module.ts`
- Modify: `apps/examples/drizzle-neon/package.json`
- Modify: `apps/examples/drizzle-neon/.env.example`

**Key Decisions / Notes:**
- Currently has: Drizzle/neon driver DB + JWT auth — very minimal
- **IMPORTANT:** Before implementing, verify `@magnet-cms/adapter-db-drizzle` supports `driver: 'pg'` by reading `packages/adapters/db-drizzle/src/index.ts`. The Drizzle adapter's DrizzleConfig type (`packages/common/src/types/database.types.ts:19`) lists `'pg'` as a valid driver option.
- Change Drizzle driver from `'neon'` to `'pg'` for local Docker PostgreSQL (Neon driver requires real Neon endpoint). Update connection string to use `localhost:5433`
- Verify that removing `@neondatabase/serverless` doesn't break any direct imports in the drizzle-neon example code (check `src/` for `@neondatabase` imports)
- Add to `MagnetModule.forRoot()`:
  - `storage: { adapter: 's3', s3: { bucket: process.env.S3_BUCKET || 'magnet-media', region: process.env.S3_REGION || 'us-east-1', accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin', secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin', endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000', forcePathStyle: true } }`
  - `email: { adapter: 'nodemailer', nodemailer: { host: process.env.SMTP_HOST || 'localhost', port: Number(process.env.SMTP_PORT || 1025), secure: false, auth: { user: '', pass: '' } }, defaults: { from: 'noreply@magnet.local' } }`
  - `vault: { adapter: 'db' }`
  - `admin: true`
  - `plugins: [{ plugin: ContentBuilderPlugin }, { plugin: SeoPlugin }]`
- Add deps: `@magnet-cms/adapter-storage-s3`, `@magnet-cms/email-nodemailer`, `@magnet-cms/plugin-content-builder`, `@magnet-cms/plugin-seo`
- Remove `@neondatabase/serverless` dep since we switch to `pg` driver

**Definition of Done:**
- [ ] App starts with `bun run dev` using local PostgreSQL + MinIO
- [ ] `GET /health` returns 200
- [ ] Database tables are created successfully against local PostgreSQL (Drizzle auto-creates via `supportsLazyCreation`)
- [ ] File upload to `/media/upload` stores file in MinIO (verify via MinIO Console at :9001)
- [ ] Admin UI accessible at `/admin`
- [ ] SEO plugin endpoints respond
- [ ] `bun run check-types` passes

**Verify:**
- `cd apps/examples/drizzle-neon && bun run check-types`

---

### Task 5: Drizzle-supabase example adapter integration

**Objective:** Update drizzle-supabase example to use: Drizzle/Supabase pg DB + Supabase Auth + Supabase Storage + DB vault + Console email + Content Builder + SEO plugins + admin UI.

**Dependencies:** None (Supabase Docker stack already exists at `apps/examples/drizzle-supabase/docker/docker-compose.yml` — verified during exploration, includes: db, studio, meta, auth, storage, imgproxy, rest, kong containers)

**Files:**
- Verify: `apps/examples/drizzle-supabase/docker/docker-compose.yml` (existing — no changes needed)
- Modify: `apps/examples/drizzle-supabase/src/app.module.ts`
- Modify: `apps/examples/drizzle-supabase/package.json`
- Modify: `apps/examples/drizzle-supabase/.env.example`

**Key Decisions / Notes:**
- Currently has: Drizzle DB + Supabase Auth + local storage — good base
- Change storage from local to Supabase: `storage: { adapter: 'supabase', supabase: { supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:8000', supabaseKey: process.env.SUPABASE_SERVICE_KEY || '', bucket: process.env.SUPABASE_STORAGE_BUCKET || 'media' } }`
- Add: `vault: { adapter: 'db' }`, `admin: true`
- Add: `plugins: [{ plugin: ContentBuilderPlugin }, { plugin: SeoPlugin }]`
- No email adapter config (ConsoleEmailAdapter is always active as fallback)
- Add deps: `@magnet-cms/adapter-storage-supabase`, `@magnet-cms/plugin-content-builder`, `@magnet-cms/plugin-seo`

**Definition of Done:**
- [ ] `docker compose -f apps/examples/drizzle-supabase/docker/docker-compose.yml up -d` starts the Supabase stack
- [ ] App starts with `bun run dev` against local Supabase Docker stack
- [ ] `GET /health` returns 200
- [ ] Supabase Auth login/register works
- [ ] File upload stores in Supabase Storage
- [ ] Admin UI accessible at `/admin`
- [ ] `bun run check-types` passes

**Verify:**
- `cd apps/examples/drizzle-supabase && bun run check-types`

---

### Task 6: E2E testing helpers (MailPit client, MinIO setup)

**Objective:** Create reusable helpers for E2E tests to interact with MailPit (verify email delivery) and MinIO (bucket management/verification).

**Dependencies:** Tasks 1, 2 (Docker services running)

**Files:**
- Create: `apps/e2e/src/helpers/mailpit-client.ts`
- Create: `apps/e2e/src/helpers/s3-test-helpers.ts`
- Modify: `apps/e2e/src/helpers/index.ts`

**Key Decisions / Notes:**
- **MailPit client:** REST API client at `http://localhost:8025/api/v1/`
  - `getMessages()` — list received emails
  - `searchMessages(query)` — search by to/from/subject
  - `getMessage(id)` — get full email with body
  - `deleteAllMessages()` — cleanup between tests
  - Uses `fetch()` (built into Bun/Node 18+), no external deps
- **S3 helpers:** Utility to verify objects exist in MinIO
  - `listObjects(bucket)` — list bucket contents via S3 API
  - `objectExists(bucket, key)` — check if uploaded file exists
  - Uses simple HTTP calls to MinIO S3 API with AWS Signature v4 (or use `@aws-sdk/client-s3` if already a dep)
  - Actually, simpler approach: just verify via the Magnet `/media/*` API endpoints — the storage adapter handles the S3 interaction
- **Decision:** Skip direct MinIO verification — test through Magnet's media API instead. The S3 helpers file becomes a thin wrapper that sets up test state.

**Definition of Done:**
- [ ] `MailPitClient` class with getMessages, searchMessages, getMessage, deleteAllMessages methods
- [ ] All methods have TypeScript types (no `any`)
- [ ] Helper exports are in `apps/e2e/src/helpers/index.ts`

**Verify:**
- `cd apps/e2e && bun run check-types`

---

### Task 7: E2E test orchestration updates

**Objective:** Update the docker-manager and test-all-templates-robust scripts to handle new Docker services and pass adapter-specific env vars to each example.

**Dependencies:** Tasks 1-5 (all Docker and example changes)

**Files:**
- Modify: `apps/e2e/scripts/docker-manager.ts`
- Modify: `apps/e2e/scripts/test-all-templates-robust.ts`
- Modify: `package.json` (root) — add `"test:all": "bun apps/e2e/scripts/test-all-templates-robust.ts"` script

**Key Decisions / Notes:**
- **docker-manager.ts:**
  - Update examples config to include new services and their health checks
  - Add MinIO health check for drizzle-neon: `curl -sf http://localhost:9000/minio/health/live`
  - Add MailPit health check: `curl -sf http://localhost:8025/api/v1/messages`
  - Add Vault health check for mongoose: already exists (`docker exec mongoose-vault vault status`)
  - Increase `maxAttempts` for drizzle-neon (MinIO init takes a few seconds)
- **test-all-templates-robust.ts:**
  - Update `EXAMPLE_ENV_VARS` to include storage, email, vault, and admin config per template
  - mongoose: add `VAULT_ADDR`, `VAULT_TOKEN`, `SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM`
  - drizzle-neon: add `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_ENDPOINT`, `SMTP_HOST`, `SMTP_PORT`, `VAULT_MASTER_KEY`
  - drizzle-supabase: add `SUPABASE_STORAGE_BUCKET`
  - Set `TEMPLATE_NAME` env var so tests can conditionally run adapter-specific tests

**Definition of Done:**
- [ ] `bun scripts/docker-manager.ts start mongoose` starts all 3 services (MongoDB + Vault + MailPit)
- [ ] `bun scripts/docker-manager.ts start drizzle-neon` starts all 3 services (PostgreSQL + MinIO + MailPit)
- [ ] `bun scripts/test-all-templates-robust.ts --example=mongoose` passes correct env vars
- [ ] `bun run test:all --example=mongoose` works from root (root package.json script wired up)
- [ ] No TypeScript errors

**Verify:**
- `cd apps/e2e && bun run check-types`

---

### Task 8: Vault E2E test suite

**Objective:** Create E2E tests for the vault REST API that verify secret CRUD and health check across adapters.

**Dependencies:** Tasks 3, 4, 7 (examples configured, orchestration updated)

**Files:**
- Create: `apps/e2e/tests/api/vault.spec.ts`
- Modify: `apps/e2e/src/helpers/api-client.ts` (add vault methods)

**Key Decisions / Notes:**
- API endpoints: `GET /vault/status`, `GET /vault/secrets`, `GET /vault/secrets/:key`, `POST /vault/secrets/:key`, `DELETE /vault/secrets/:key`
- All vault endpoints require authentication (`RestrictedRoute`)
- Tests should be template-aware: check `TEMPLATE_NAME` to assert correct adapter type
  - mongoose → expects `adapter: 'hashicorp'`
  - drizzle-neon → expects `adapter: 'db'`
  - drizzle-supabase → expects `adapter: 'db'`
- Add to ApiClient: `getVaultStatus()`, `listVaultSecrets()`, `getVaultSecret(key)`, `setVaultSecret(key, data)`, `deleteVaultSecret(key)`

**Definition of Done:**
- [ ] Vault status test: verifies health=true and correct adapter type per template
- [ ] Vault CRUD test: create secret → read → verify value → update → verify → delete → verify gone
- [ ] All tests pass against mongoose example (HashiCorp Vault)
- [ ] All tests pass against drizzle-neon example (DB vault)

**Verify:**
- `cd apps/e2e && bun run test -- --project=api tests/api/vault.spec.ts`

---

### Task 9: Email E2E test suite

**Objective:** Create E2E tests that trigger email sends and verify delivery via MailPit REST API.

**Dependencies:** Tasks 3, 4, 6, 7 (examples configured, MailPit client ready)

**Files:**
- Create: `apps/e2e/tests/api/email.spec.ts`

**Key Decisions / Notes:**
- **IMPORTANT:** `NotificationSettings.emailChannelEnabled` defaults to `false` (see `packages/core/src/modules/notification/notification.settings.ts:71`). The notification service at line 282 checks this setting and skips email delivery when disabled. Tests MUST enable this setting in a `beforeAll` hook via `PUT /settings/notifications` with `{ emailChannelEnabled: true }`.
- Email is sent internally by the CMS (no "send test email" endpoint) — trigger via:
  - `POST /notifications` (requires auth, with `channels: ['email']`) — sends notification email
  - User registration flow — may send verification email if configured
- Tests should be conditional: only run when `TEMPLATE_NAME` is mongoose or drizzle-neon (these have MailPit)
- Test flow:
  1. Enable email channel: `PUT /settings/notifications` with `{ emailChannelEnabled: true }`
  2. Clear MailPit inbox (`DELETE /api/v1/messages`)
  3. Trigger action that sends email (e.g., send notification with `channels: ['email']`)
  4. Poll MailPit REST API for received messages
  5. Assert email subject, recipient, and body content
  6. Teardown: restore `emailChannelEnabled: false`
- For drizzle-supabase (console adapter only): skip email delivery tests, just verify the adapter doesn't error

**Definition of Done:**
- [ ] Test enables `NotificationSettings.emailChannelEnabled` via settings API in beforeAll
- [ ] Test triggers email send via notification API with `channels: ['email']`
- [ ] Test verifies email appears in MailPit within 10 seconds
- [ ] Test verifies email subject and recipient match expected values
- [ ] Test restores `emailChannelEnabled: false` in afterAll
- [ ] Tests skip gracefully when TEMPLATE_NAME is drizzle-supabase
- [ ] No TypeScript errors

**Verify:**
- `cd apps/e2e && bun run check-types`

---

### Task 10: Storage E2E test suite

**Objective:** Create E2E tests for storage operations (upload, list, download, delete) that work across all storage adapters.

**Dependencies:** Tasks 3, 4, 5, 7 (all examples configured)

**Files:**
- Create: `apps/e2e/tests/api/storage.spec.ts`

**Key Decisions / Notes:**
- Uses existing media API endpoints already in ApiClient: `uploadMedia()`, `getMediaList()`, `getMedia(id)`, `deleteMedia(id)`, `getMediaFile(id)`
- The existing `apps/e2e/tests/ui/media.spec.ts` tests the UI — this task tests the API layer more thoroughly
- Test matrix:
  - Upload file → verify 200 response with file metadata
  - List files → verify uploaded file appears
  - Get file → verify content can be retrieved
  - Delete file → verify 200 and file is gone from list
  - Upload with folder → verify folder organization
  - Upload with tags/alt → verify metadata persists
- Template-specific assertions:
  - mongoose (local): file URL starts with `/media/`
  - drizzle-neon (S3/MinIO): file URL contains the S3 endpoint or bucket path
  - drizzle-supabase (Supabase): file URL contains Supabase storage URL
- Use a small test PNG file (1x1 pixel, generated in-memory with Buffer)

**Definition of Done:**
- [ ] Upload test passes on all 3 storage adapters
- [ ] File can be retrieved after upload on all adapters
- [ ] Delete removes the file on all adapters
- [ ] Metadata (tags, alt, folder) persists across all adapters
- [ ] No TypeScript errors

**Verify:**
- `cd apps/e2e && bun run test -- --project=api tests/api/storage.spec.ts`

---

### Task 11: GitHub Actions E2E workflow

**Objective:** Create a CI workflow that runs E2E tests for all 3 example templates with Docker services.

**Dependencies:** Tasks 1-10 (all infrastructure and tests ready)

**Files:**
- Create: `.github/workflows/e2e.yml`

**Key Decisions / Notes:**
- Trigger: PR to main + push to main (same as existing ci.yml)
- Strategy: run each example as a separate job for parallelism + clear failure isolation
- Each job:
  1. Checkout + setup Bun + setup Node
  2. Install deps (`bun install --frozen-lockfile`)
  3. Build packages (`bun run build`)
  4. Start Docker services for that example
  5. Start backend server + admin UI in background
  6. Wait for health check
  7. Install Playwright browsers
  8. Run E2E tests with `TEMPLATE_NAME` set
  9. Upload test results as artifacts on failure
- Docker images: cache with `docker/setup-buildx-action` + layer caching
- Timeout: 15 minutes per job (Supabase stack is slow)
- Concurrency: cancel in-progress for same PR (match existing ci.yml pattern)
- Use `services` key in GitHub Actions for simple containers (MongoDB, PostgreSQL, MinIO, MailPit) — but Supabase is too complex, use Docker Compose directly

**Definition of Done:**
- [ ] Workflow triggers on PR to main
- [ ] mongoose E2E job passes in CI
- [ ] drizzle-neon E2E job passes in CI
- [ ] drizzle-supabase E2E job passes in CI
- [ ] Test reports uploaded as artifacts on failure
- [ ] Jobs run in parallel (separate jobs per example)

**Verify:**
- Push branch, open PR, verify GitHub Actions runs E2E workflow

### Task 12: Admin UI E2E tests for adapter pages

**Objective:** Create Admin UI E2E tests that verify vault, storage, and settings pages work correctly across all adapter combinations.

**Dependencies:** Tasks 3-5, 7, 10 (examples configured, orchestration ready, API storage tests as reference)

**Files:**
- Create: `apps/e2e/tests/ui/vault.spec.ts`
- Create: `apps/e2e/tests/ui/storage-upload.spec.ts`
- Modify: `apps/e2e/tests/ui/settings.spec.ts` (extend for notification settings toggle)

**Key Decisions / Notes:**
- **Vault UI tests:** Navigate to vault secrets page, create a secret via UI, verify it appears in the list, delete it
- **Storage upload UI tests:** Navigate to media library, upload a file via the UI file picker, verify it appears in the grid, delete it
- **Settings UI tests:** Navigate to notification settings, toggle email channel enabled, verify the toggle persists after page reload
- All tests use the existing page object pattern (e.g., `LoginPage`, `DashboardPage`)
- Tests should login via the auth fixture's `testUser`, then navigate to admin pages
- Template-aware: vault secrets page content depends on whether HashiCorp or DB adapter is used (verify status indicator shows correct adapter)

**Definition of Done:**
- [ ] Vault UI test: create secret → see it in list → delete → verify gone
- [ ] Storage upload UI test: upload file → see in media grid → delete → verify gone
- [ ] Settings UI test: toggle notification email channel → verify persists
- [ ] All UI tests pass against at least the mongoose example
- [ ] No TypeScript errors

**Verify:**
- `cd apps/e2e && bun run test -- --project=ui tests/ui/vault.spec.ts tests/ui/storage-upload.spec.ts`

---

## Open Questions

None — all design decisions resolved.

### Deferred Ideas

- **Clerk auth E2E testing:** Requires real Clerk account. Could add when Clerk provides a local dev server.
- **R2 storage testing:** R2 is S3-compatible; MinIO tests already validate the protocol. Add explicit R2 test when Cloudflare provides local emulator.
- **Resend email testing:** Requires API key. MailPit + Nodemailer covers the email adapter contract.
- **Supabase Vault testing:** Requires specific PostgreSQL extensions. DB vault + HashiCorp already cover the vault contract.
- **Performance benchmarks:** E2E infrastructure enables future load testing. Defer to separate task.
- **Documentation:** Update docs site with E2E setup guide. Defer to separate task.
