# Email Adapter Abstraction Implementation Plan

Created: 2026-03-14
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary
**Goal:** Implement a built-in console fallback adapter that wraps any configured email adapter (logging all emails and delegating to the real adapter), rename adapter packages to the new convention, add unit tests for both adapters, and export the email module from core so plugins can depend on it.

**Architecture:** `ConsoleEmailAdapter` is a built-in adapter in core that always wraps the configured adapter. It logs a summary of every email (to/from/subject + truncated body) via `MagnetLogger`, delegates to the inner adapter if present, and catches failures gracefully. `EmailModule.forRoot()` always creates this wrapper — no configuration needed. The email module is exported from `@magnet-cms/core` index so plugins can import `EmailService`.

**Tech Stack:** NestJS (DI, @Optional/@Inject), MagnetLogger, class-validator types from `@magnet-cms/common`

## Scope
### In Scope
1. `ConsoleEmailAdapter` — built-in wrapper adapter in core's email module
2. Integration into `EmailModule.forRoot()` — always wraps the configured adapter
3. Rename adapter packages: `@magnet-cms/adapter-email-*` → `@magnet-cms/email-*`
4. Update `EmailAdapterFactory` to reference new package names
5. Unit tests for `ConsoleEmailAdapter`
6. Unit tests for `NodemailerEmailAdapter` and `ResendEmailAdapter` (mocked externals)
7. Export email module from `@magnet-cms/core` index

### Out of Scope
- E2E tests with real SMTP/Resend (requires external services)
- Notification channel email adapter (separate concern in notification module)
- Admin UI changes for email configuration
- `create-magnet` CLI updates for email adapter selection

## Context for Implementer
> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - Storage has a built-in `LocalStorageAdapter` in core and external packages for S3/R2/Supabase — email should follow the same pattern with `ConsoleEmailAdapter` as the built-in
  - `StorageAdapterFactory` at `packages/core/src/modules/storage/storage-adapter.factory.ts` shows the factory pattern
  - Email adapter abstract class at `packages/common/src/types/email.types.ts:155` defines `send`, `sendBatch`, `verify`, `dispose`
  - Existing adapter implementations: `packages/adapters/email-nodemailer/src/nodemailer.adapter.ts`, `packages/adapters/email-resend/src/resend.adapter.ts`

- **Conventions:**
  - All adapters extend `EmailAdapter` from `@magnet-cms/common`
  - Each adapter exports both a named class AND re-exports as `EmailAdapter` for auto-detection
  - Package names follow `@magnet-cms/<hook>-<provider>` pattern (e.g., `@magnet-cms/email-nodemailer`)
  - Use `MagnetLogger` for all logging (not raw `console.log`)
  - Use `@SettingField.*` decorators for settings (not class-validator)

- **Key files:**
  - `packages/common/src/types/email.types.ts` — `EmailAdapter` abstract class, `SendEmailOptions`, `SendEmailResult`
  - `packages/core/src/modules/email/email.module.ts` — DI module, `forRoot()` with adapter factory
  - `packages/core/src/modules/email/email.service.ts` — Core service, `EMAIL_ADAPTER_TOKEN`, event handlers
  - `packages/core/src/modules/email/email-adapter.factory.ts` — Dynamic require for adapter packages
  - `packages/core/src/modules/email/index.ts` — Module barrel exports
  - `packages/core/src/index.ts` — Core package barrel exports (email NOT currently exported)

- **Gotchas:**
  - `EmailModule` is `global: true` — EmailService is injectable everywhere via DI
  - `EMAIL_ADAPTER_TOKEN` is `@Optional()` in EmailService constructor — null when no adapter configured
  - `EmailAdapterFactory.create()` uses `require()` (not `import()`) for dynamic loading
  - The factory looks for `adapterModule.EmailAdapter` (the re-exported named export)
  - The factory's `packageMap` currently uses `@magnet-cms/adapter-email-*` names — must update

- **Domain context:**
  - The console adapter is a development/debugging tool — in production, users configure a real adapter
  - The wrapping behavior means: log first, then delegate, catch failures
  - When no inner adapter exists, the console adapter still returns `{ accepted: true }` so callers don't see errors

## Assumptions
- The `ConsoleEmailAdapter` should live in core alongside other email module files — supported by the `LocalStorageAdapter` pattern in `packages/core/src/modules/storage/adapters/` — Tasks 1, 2 depend on this
- The `MagnetLogger` is available via DI and can be passed to the console adapter — supported by `email.service.ts:40` which receives logger via constructor — Task 1 depends on this
- Package renaming only requires updating `package.json` name field and factory references — supported by grep showing only 5 files reference the old names — Task 4 depends on this

## Risks and Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Console adapter wrapping changes EmailService behavior | Medium | Medium | ConsoleEmailAdapter returns same result types as real adapters; existing tests verify behavior |
| Package rename breaks existing user projects | Low | High | Users are internal (monorepo only); no published packages yet. Old names not used externally. |
| Logger injection in adapter factory | Low | Low | ConsoleEmailAdapter receives logger as constructor param, not via DI |

## Goal Verification
### Truths
1. When no email adapter is configured, emails are logged to console with summary (to/from/subject/truncated body) instead of being silently dropped
2. When a real adapter is configured, emails are both logged to console AND sent via the adapter
3. When a configured adapter fails, the email is still logged to console and the error is captured
4. Plugins can `import { EmailService } from '@magnet-cms/core'` and inject it
5. Both adapter packages are named `@magnet-cms/email-nodemailer` and `@magnet-cms/email-resend`
6. Unit tests exist for ConsoleEmailAdapter, NodemailerEmailAdapter, and ResendEmailAdapter

### Artifacts
1. `packages/core/src/modules/email/adapters/console-email.adapter.ts` — ConsoleEmailAdapter implementation
2. `packages/core/src/modules/email/adapters/console-email.adapter.test.ts` — Unit tests
3. `packages/adapters/email-nodemailer/src/__tests__/nodemailer.adapter.test.ts` — Adapter tests
4. `packages/adapters/email-resend/src/__tests__/resend.adapter.test.ts` — Adapter tests
5. `packages/core/src/index.ts` — Updated with email export

## Progress Tracking
- [x] Task 1: Implement ConsoleEmailAdapter
- [x] Task 2: Integrate ConsoleEmailAdapter into EmailModule
- [x] Task 3: Export email module from core
- [x] Task 4: Rename adapter packages
- [x] Task 5: Unit tests for ConsoleEmailAdapter
- [x] Task 6: Unit tests for Nodemailer adapter
- [x] Task 7: Unit tests for Resend adapter
- [x] Task 8: Type check and verify
**Total Tasks:** 8 | **Completed:** 8 | **Remaining:** 0

## Implementation Tasks

### Task 1: Implement ConsoleEmailAdapter
**Objective:** Create a built-in email adapter that wraps an optional inner adapter, logging a summary of every email via MagnetLogger.
**Dependencies:** None

**Files:**
- Create: `packages/core/src/modules/email/adapters/console-email.adapter.ts`

**Key Decisions / Notes:**
- Extends `EmailAdapter` from `@magnet-cms/common`
- Constructor takes `(logger: Logger, inner?: EmailAdapter | null)`
- `name` is `'console'` (or `inner.name` if wrapping)
- `send()`: log summary (to/from/subject + first 200 chars of body), then delegate to inner if present
- `sendBatch()`: iterate and call `send()` for each
- `verify()`: delegate to inner if present, else return `true`
- On inner adapter failure: log warning, return `{ accepted: false, error: ... }`
- Log format: `[Email] To: x@y.com | Subject: "Hello" | Body: "First 200 chars..."`

**Definition of Done:**
- [ ] `ConsoleEmailAdapter` extends `EmailAdapter` with all abstract methods implemented
- [ ] Logs summary (to/from/subject/truncated body) for every email
- [ ] Delegates to inner adapter when present
- [ ] Catches inner adapter failures and logs them

**Verify:**
- `cd packages/core && npx tsc --noEmit`

### Task 2: Integrate ConsoleEmailAdapter into EmailModule
**Objective:** Modify `EmailModule.forRoot()` to always wrap the configured adapter (or null) with `ConsoleEmailAdapter`.
**Dependencies:** Task 1

**Files:**
- Modify: `packages/core/src/modules/email/email.module.ts`

**Key Decisions / Notes:**
- After `EmailAdapterFactory.create(config)`, wrap with `new ConsoleEmailAdapter(logger, adapter)`
- When no config provided, create `new ConsoleEmailAdapter(logger, null)`
- The `EMAIL_ADAPTER_TOKEN` provider always has a value now (never null)
- Remove `@Optional()` from `EmailService` constructor's adapter injection since it's always present
- Remove null-guard early returns from `send()` (line 128), `sendRaw()` (line 156), `verify()` (line 191), `isConfigured()` (line 203), and the three event handlers: `onEmailVerificationRequested` (line 214), `onUserRegistered` (line 238), `onPasswordResetRequested` (line 284). After this task, `this.adapter` is always a `ConsoleEmailAdapter` instance so these guards are unreachable dead code.
- `isConfigured()` should check whether the console adapter has an inner (real) adapter, not just whether `this.adapter` is non-null

**Definition of Done:**
- [ ] `EmailModule.forRoot()` always wraps adapter with `ConsoleEmailAdapter`
- [ ] `EmailService` no longer has null adapter paths
- [ ] All null-guard early-returns on `this.adapter` removed from EmailService methods
- [ ] `EMAIL_ADAPTER_TOKEN` is always provided

**Verify:**
- `cd packages/core && npx tsc --noEmit`

### Task 3: Export email module from core
**Objective:** Add email module exports to `@magnet-cms/core` index so plugins can import `EmailService`.
**Dependencies:** None

**Files:**
- Modify: `packages/core/src/index.ts`

**Key Decisions / Notes:**
- Add `export * from './modules/email'` between existing module exports
- This exposes `EmailModule`, `EmailService`, `EmailVerificationService`, `TemplateService`

**Definition of Done:**
- [ ] `export * from './modules/email'` present in `packages/core/src/index.ts`
- [ ] `EmailService` is importable from `@magnet-cms/core`

**Verify:**
- `cd packages/core && npx tsc --noEmit`

### Task 4: Rename adapter packages
**Objective:** Rename email adapter packages from `@magnet-cms/adapter-email-*` to `@magnet-cms/email-*` and update all references.
**Dependencies:** None

**Files:**
- Modify: `packages/adapters/email-nodemailer/package.json` — change `name` to `@magnet-cms/email-nodemailer`
- Modify: `packages/adapters/email-resend/package.json` — change `name` to `@magnet-cms/email-resend`
- Modify: `packages/core/src/modules/email/email-adapter.factory.ts` — update both `packageMap` values and fallback pattern
- Modify: `.claude/rules/magnet-project.md` — update package name entries in the Packages table

**Key Decisions / Notes:**
- No external consumers — packages are internal to the monorepo
- Two `packageMap` objects in `email-adapter.factory.ts` must be updated — the primary map (lines 18-21) AND the duplicate in the catch block (lines 50-53). Both must use `@magnet-cms/email-nodemailer` and `@magnet-cms/email-resend`.
- The factory's fallback pattern `@magnet-cms/adapter-email-${adapterName}` should also change to `@magnet-cms/email-${adapterName}`
- Also update `.claude/rules/magnet-project.md` package table entries

**Definition of Done:**
- [ ] `package.json` names updated to `@magnet-cms/email-nodemailer` and `@magnet-cms/email-resend`
- [ ] Both `packageMap` instances in `email-adapter.factory.ts` updated (primary + catch block)
- [ ] Factory fallback pattern uses `@magnet-cms/email-${adapterName}`
- [ ] `.claude/rules/magnet-project.md` package table reflects new names

**Verify:**
- `bun install` (regenerate lockfile)
- `cd packages/core && npx tsc --noEmit`

### Task 5: Unit tests for ConsoleEmailAdapter
**Objective:** Test all ConsoleEmailAdapter behaviors — logging, delegation, failure handling.
**Dependencies:** Task 1

**Files:**
- Create: `packages/core/src/modules/email/adapters/__tests__/console-email.adapter.test.ts`

**Key Decisions / Notes:**
- Mock `Logger` to assert log calls
- Test 1: send without inner adapter → logs summary, returns accepted
- Test 2: send with inner adapter → logs summary, delegates, returns inner result
- Test 3: inner adapter throws → logs summary + warning, returns failure result
- Test 4: sendBatch delegates each email
- Test 5: verify delegates to inner, returns true when no inner
- Use `bun test` runner (project uses Bun)

**Definition of Done:**
- [ ] All 5 test scenarios pass
- [ ] Tests mock external dependencies (Logger, inner adapter)

**Verify:**
- `cd packages/core && bun test src/modules/email/adapters/__tests__/console-email.adapter.test.ts`

### Task 6: Unit tests for Nodemailer adapter
**Objective:** Test NodemailerEmailAdapter with mocked nodemailer transport.
**Dependencies:** None

**Files:**
- Create: `packages/adapters/email-nodemailer/src/__tests__/nodemailer.adapter.test.ts`

**Key Decisions / Notes:**
- Mock `nodemailer.createTransport` to return a mock transporter
- Test send success (mock `sendMail` returns accepted addresses)
- Test send failure (mock `sendMail` throws)
- Test verify success/failure
- Test dispose closes transporter
- Test lazy transporter creation (reuse)

**Definition of Done:**
- [ ] Tests cover send, verify, dispose, and error paths
- [ ] All external deps (nodemailer) mocked

**Verify:**
- `cd packages/adapters/email-nodemailer && bun test`

### Task 7: Unit tests for Resend adapter
**Objective:** Test ResendEmailAdapter with mocked Resend client.
**Dependencies:** None

**Files:**
- Create: `packages/adapters/email-resend/src/__tests__/resend.adapter.test.ts`

**Key Decisions / Notes:**
- Mock `Resend` class from `resend` package
- Test send success (mock `emails.send` returns data with id)
- Test send with API error (mock returns `{ error }`)
- Test send with thrown exception
- Test sendBatch success and failure
- Test verify via `domains.list`

**Definition of Done:**
- [ ] Tests cover send, sendBatch, verify, and error paths
- [ ] All external deps (Resend client) mocked

**Verify:**
- `cd packages/adapters/email-resend && bun test`

### Task 8: Type check and verify
**Objective:** Full type check and quality verification.
**Dependencies:** Tasks 1-7

**Files:** None (verification only)

**Definition of Done:**
- [ ] `bun run check-types` passes for core package
- [ ] All new tests pass
- [ ] `bun run lint` clean on changed files

**Verify:**
- `bun run check-types` (full monorepo — note: `@magnet-cms/cli` has pre-existing errors from adapter restructuring, ignore those)
- `bunx biome check packages/core/src/modules/email/ packages/adapters/email-nodemailer/ packages/adapters/email-resend/`
