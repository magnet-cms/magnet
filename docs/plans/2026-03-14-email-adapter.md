# Email Adapter Implementation Plan

Created: 2026-03-14
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Create an extensible, fully configurable email adapter system for Magnet CMS with Nodemailer and Resend as first-class providers, a Handlebars template engine, and built-in transactional emails (password reset, welcome, email verification).

**Architecture:** Define an abstract `EmailAdapter` class in `@magnet-cms/common` (like `StorageAdapter` and `DatabaseAdapter`). Create two adapter packages: `@magnet-cms/adapter-nodemailer` and `@magnet-cms/adapter-resend`. Add an `EmailModule` in `@magnet-cms/core` that loads the configured adapter, manages Handlebars templates, and exposes an `EmailService`. Wire transactional emails into the auth flow via events.

**Tech Stack:** Nodemailer, Resend SDK, Handlebars, NestJS modules

## Scope

### In Scope
- Abstract `EmailAdapter` class in `@magnet-cms/common` with `send()`, `sendBatch()`, `verify()`
- Email config types in `@magnet-cms/common` (`EmailConfig` added to `MagnetModuleOptions`)
- `@magnet-cms/adapter-nodemailer` package (SMTP via Nodemailer)
- `@magnet-cms/adapter-resend` package (Resend API)
- `EmailModule` + `EmailService` in `@magnet-cms/core` with template rendering
- `EmailSettings` admin settings (from address, from name, enabled toggle)
- Handlebars template system with default templates for auth emails
- Three transactional emails: password reset, welcome, email verification
- Email verification flow (token generation, verification endpoint, `emailVerified` field on User)
- Event-driven integration (`@OnEvent` handlers in EmailService)
- E2E tests for email API

### Out of Scope
- Email template management UI in admin panel (deferred)
- Email delivery tracking / webhooks
- Marketing / bulk email campaigns
- Custom SMTP per-tenant (multi-tenancy)

## Context for Implementer

> The codebase follows a consistent adapter pattern. Database adapters (`packages/adapters/mongoose`, `packages/adapters/drizzle`) implement `DatabaseAdapter` from `@magnet-cms/common`. Storage adapters implement `StorageAdapter`. Auth uses `AuthStrategy`. All are abstract classes with provider-specific implementations.

- **Patterns to follow:**
  - `packages/common/src/types/storage.types.ts` — `StorageAdapter` abstract class pattern (closest analog)
  - `packages/common/src/types/database.types.ts` — `DatabaseAdapter` with `name`, `connect`, etc.
  - `packages/common/src/types/config.types.ts` — `MagnetModuleOptions` for adding `email` config
  - `packages/adapters/mongoose/package.json` — adapter package structure (peer deps, tsup, exports)
  - `packages/core/src/modules/storage/storage.module.ts` — `StorageModule.forRoot()` pattern for loading adapter
  - `packages/core/src/modules/auth/auth.settings.ts` — `@Settings` decorator pattern for admin-configurable settings
  - `packages/core/src/modules/activity/activity.service.ts` — `@OnEvent` handler pattern for event-driven integration
  - `packages/core/src/modules/auth/auth.service.ts:425-441` — `requestPasswordReset` method that currently generates token but doesn't send email

- **Conventions:**
  - Adapter packages: `@magnet-cms/adapter-{name}` in `packages/adapters/{name}/`
  - Core modules: `packages/core/src/modules/{name}/`
  - Types in `@magnet-cms/common`: `packages/common/src/types/{name}.types.ts`
  - Settings classes use `@Settings` + `@SettingField.*` decorators
  - Events use `EventService.emit()` with `getEventContext()` for user attribution

- **Key files:**
  - `packages/common/src/types/index.ts` — must export new email types
  - `packages/core/src/magnet.module.ts` — must import EmailModule
  - `packages/core/src/modules/auth/auth.service.ts` — requestPasswordReset, register methods to integrate with
  - `packages/core/src/modules/auth/services/password-reset.service.ts` — generates reset tokens

- **Gotchas:**
  - Adapter detection uses `require(@magnet-cms/adapter-${name})` pattern (see `database-adapter.factory.ts:17-19`)
  - The `MagnetModuleOptions` constructor must be updated to accept `email` field
  - The User schema (`packages/core/src/modules/user/schemas/user.schema.ts`) needs `emailVerified` field for email verification flow
  - Event payloads are typed in `packages/common/src/types/events.types.ts` — new email events must be added

## Runtime Environment

- **Start command:** `bun run dev` (full monorepo dev)
- **Port:** 3000 (NestJS API)
- **Health check:** `curl http://localhost:3000/api/health`

## Assumptions

- Nodemailer and Resend SDK can be added as peer dependencies to their respective adapter packages — supported by existing adapter pattern (`mongoose/package.json:36-42`) — Tasks 3, 4 depend on this
- The existing event system supports new email event types — supported by `events.types.ts` being the single source for event names — Tasks 6, 7, 8 depend on this
- Handlebars can be used without a build step (runtime compilation) — supported by handlebars runtime API — Task 5 depends on this
- The auth settings `requireEmailVerification` flag already exists (`auth.settings.ts:143`) but the verification flow doesn't — Task 8 depends on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Circular dependency between EmailModule and AuthModule | Medium | High | Use `forwardRef()` and event-driven integration (EmailService listens to events, doesn't import AuthService) |
| Template rendering failures silently swallow errors | Medium | Medium | EmailService wraps template rendering in try/catch and logs errors via MagnetLogger; never throws to callers |
| SMTP connection failures block app startup | Low | High | EmailAdapter.verify() is called on startup but failure only logs a warning, doesn't prevent boot |

## Goal Verification

### Truths
1. `EmailAdapter` abstract class exists in `@magnet-cms/common` with `send()`, `sendBatch()`, `verify()` methods
2. `@magnet-cms/adapter-nodemailer` sends emails via SMTP when configured
3. `@magnet-cms/adapter-resend` sends emails via Resend API when configured
4. Adding `email: { adapter: 'nodemailer', nodemailer: { host, port, auth } }` to MagnetModuleOptions configures the system
5. Password reset flow sends a templated email with the reset link
6. User registration sends a welcome email
7. Email verification flow generates a token, sends a verification email, and verifies the token via API endpoint
8. Email settings are manageable from the admin panel (from address, from name, enabled)

### Artifacts
- `packages/common/src/types/email.types.ts` — EmailAdapter abstract class + config types
- `packages/adapters/nodemailer/` — Nodemailer adapter package
- `packages/adapters/resend/` — Resend adapter package
- `packages/core/src/modules/email/` — EmailModule, EmailService, EmailSettings, templates
- `packages/core/src/modules/user/schemas/user.schema.ts` — emailVerified field
- `packages/common/src/types/events.types.ts` — new email event types

## Progress Tracking

- [x] Task 1: EmailAdapter abstract class and types
- [x] Task 2: Email config in MagnetModuleOptions
- [x] Task 3: Nodemailer adapter package
- [x] Task 4: Resend adapter package
- [x] Task 5: EmailModule, EmailService, and template engine
- [x] Task 6: Password reset email integration
- [x] Task 7: Welcome email integration
- [x] Task 8: Email verification flow
- [x] Task 9: EmailSettings for admin panel
- [x] Task 10: E2E tests

**Total Tasks:** 10 | **Completed:** 10 | **Remaining:** 0

## Implementation Tasks

### Task 1: EmailAdapter Abstract Class and Types

**Objective:** Define the abstract `EmailAdapter` class and all email-related types in `@magnet-cms/common`.

**Dependencies:** None

**Files:**
- Create: `packages/common/src/types/email.types.ts`
- Modify: `packages/common/src/types/index.ts`

**Key Decisions / Notes:**
- Follow `StorageAdapter` pattern from `packages/common/src/types/storage.types.ts`
- `EmailAdapter` abstract class with:
  - `abstract readonly name: string` — adapter identifier
  - `abstract send(options: SendEmailOptions): Promise<SendEmailResult>` — send single email
  - `abstract sendBatch(emails: SendEmailOptions[]): Promise<SendEmailResult[]>` — batch send
  - `abstract verify(): Promise<boolean>` — test connection/API key
- Types: `SendEmailOptions` (to, from, subject, html, text, replyTo, attachments), `SendEmailResult` (id, accepted, rejected), `EmailAttachment` (filename, content, contentType)
- Config types: `NodemailerConfig` (host, port, secure, auth), `ResendConfig` (apiKey), `EmailConfig` (adapter name + provider configs)

**Definition of Done:**
- [ ] `EmailAdapter` abstract class exported from `@magnet-cms/common`
- [ ] All config/option/result types exported
- [ ] No diagnostics errors
- [ ] `bun run check-types` passes

**Verify:**
- `bun run check-types`

### Task 2: Email Config in MagnetModuleOptions

**Objective:** Add `email` configuration field to `MagnetModuleOptions` so users can configure the email adapter in their app module.

**Dependencies:** Task 1

**Files:**
- Modify: `packages/common/src/types/config.types.ts`

**Key Decisions / Notes:**
- Add `email?: EmailConfig` to `MagnetModuleOptions` class
- Import `EmailConfig` from `./email.types`
- Add `email` to the constructor parameter and assignment (follow pattern of `storage` field at line 46/87)
- `EmailConfig` shape: `{ adapter: 'nodemailer' | 'resend'; nodemailer?: NodemailerConfig; resend?: ResendConfig; defaults?: { from?: string; replyTo?: string } }`

**Definition of Done:**
- [ ] `email` field accepted by `MagnetModuleOptions`
- [ ] Type-checks pass
- [ ] Existing configurations unaffected (field is optional)

**Verify:**
- `bun run check-types`

### Task 3: Nodemailer Adapter Package

**Objective:** Create `@magnet-cms/adapter-nodemailer` package implementing `EmailAdapter` using Nodemailer.

**Dependencies:** Task 1

**Files:**
- Create: `packages/adapters/nodemailer/package.json`
- Create: `packages/adapters/nodemailer/tsconfig.json`
- Create: `packages/adapters/nodemailer/tsup.config.ts`
- Create: `packages/adapters/nodemailer/biome.json`
- Create: `packages/adapters/nodemailer/src/index.ts`
- Create: `packages/adapters/nodemailer/src/nodemailer.adapter.ts`

**Key Decisions / Notes:**
- Follow `packages/adapters/mongoose/` structure exactly
- `package.json`: name `@magnet-cms/adapter-nodemailer`, peer deps on `@magnet-cms/common`, `nodemailer`
- `NodemailerEmailAdapter extends EmailAdapter`:
  - Constructor takes `NodemailerConfig`
  - `send()`: creates transporter, calls `transporter.sendMail()`
  - `sendBatch()`: iterates and calls `send()` for each
  - `verify()`: calls `transporter.verify()`
- Lazy transporter creation (create on first use, reuse connection)
- Export as `{ EmailAdapter: NodemailerEmailAdapter }` for auto-detection pattern

**Definition of Done:**
- [ ] Package builds with `tsup`
- [ ] `NodemailerEmailAdapter` implements all `EmailAdapter` methods
- [ ] Exported as default adapter for `require('@magnet-cms/adapter-nodemailer')`
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`
- `cd packages/adapters/nodemailer && bun run build`

### Task 4: Resend Adapter Package

**Objective:** Create `@magnet-cms/adapter-resend` package implementing `EmailAdapter` using Resend SDK.

**Dependencies:** Task 1

**Files:**
- Create: `packages/adapters/resend/package.json`
- Create: `packages/adapters/resend/tsconfig.json`
- Create: `packages/adapters/resend/tsup.config.ts`
- Create: `packages/adapters/resend/biome.json`
- Create: `packages/adapters/resend/src/index.ts`
- Create: `packages/adapters/resend/src/resend.adapter.ts`

**Key Decisions / Notes:**
- Same package structure as Task 3
- `ResendEmailAdapter extends EmailAdapter`:
  - Constructor takes `ResendConfig` (`{ apiKey: string }`)
  - `send()`: uses `resend.emails.send()`
  - `sendBatch()`: uses `resend.batch.send()` if available, else iterates
  - `verify()`: sends a test API call to verify the API key
- Peer dep on `resend` package

**Definition of Done:**
- [ ] Package builds with `tsup`
- [ ] `ResendEmailAdapter` implements all `EmailAdapter` methods
- [ ] Exported for auto-detection
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`
- `cd packages/adapters/resend && bun run build`

### Task 5: EmailModule, EmailService, and Template Engine

**Objective:** Create the core email module that loads the configured adapter, renders Handlebars templates, and exposes `EmailService` for sending templated emails.

**Dependencies:** Task 1, Task 2

**Files:**
- Create: `packages/core/src/modules/email/email.module.ts`
- Create: `packages/core/src/modules/email/email.service.ts`
- Create: `packages/core/src/modules/email/email-adapter.factory.ts`
- Create: `packages/core/src/modules/email/template.service.ts`
- Create: `packages/core/src/modules/email/templates/password-reset.hbs`
- Create: `packages/core/src/modules/email/templates/welcome.hbs`
- Create: `packages/core/src/modules/email/templates/email-verification.hbs`
- Create: `packages/core/src/modules/email/templates/base-layout.hbs`
- Create: `packages/core/src/modules/email/index.ts`
- Modify: `packages/core/src/magnet.module.ts` — import EmailModule

**Key Decisions / Notes:**
- `EmailModule.forRoot(emailConfig)`: creates adapter via factory, provides EmailService
- `EmailAdapterFactory`: follows `database-adapter.factory.ts` dynamic require pattern (NOT the storage adapter's hardcoded pattern). Usage: `const { EmailAdapter } = require('@magnet-cms/adapter-nodemailer')` or `require('@magnet-cms/adapter-resend')`
- `TemplateService`: loads `.hbs` files from templates directory, compiles with Handlebars, caches compiled templates
  - `render(templateName: string, context: Record<string, unknown>): string`
  - Base layout template wraps all emails with consistent header/footer
- `EmailService`:
  - `send(to, subject, template, context)` — render template + send via adapter
  - `sendRaw(options: SendEmailOptions)` — bypass templates
  - Injects `EmailSettings` for default from address
  - If no email adapter configured, log warning and no-op (don't crash)
- Default templates: clean, minimal HTML with Handlebars variables
- Add `handlebars` to `@magnet-cms/core` dependencies
- In `magnet.module.ts`: conditionally import `EmailModule.forRoot(defaultOptions.email)` only when `email` config exists
- **NotificationModule integration:** The existing `NotificationModule` references email as a notification channel. After creating `EmailService`, audit `packages/core/src/modules/notification/notification.service.ts` and wire `EmailService` as the email channel adapter for notifications. This prevents duplicate email paths.

**Definition of Done:**
- [ ] EmailModule registers in MagnetModule when email config provided
- [ ] EmailService can render templates and send via adapter
- [ ] Missing adapter config gracefully degrades (logs warning, no-op)
- [ ] Three default templates exist (password-reset, welcome, email-verification)
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`

### Task 6: Password Reset Email Integration

**Objective:** Wire the password reset flow to send a templated email with the reset link when a user requests a password reset.

**Dependencies:** Task 5

**Files:**
- Modify: `packages/common/src/types/events.types.ts` — update `user.password_reset_requested` payload type to include `plainToken` and `email`
- Modify: `packages/core/src/modules/auth/auth.service.ts` — update `emitEvent` call at line 438 to pass `{ userId: user.id, plainToken: result?.plainToken, email: user.email }`
- Modify: `packages/core/src/modules/email/email.service.ts` — add `@OnEvent('user.password_reset_requested')` handler

**Key Decisions / Notes:**
- The existing `auth.service.ts:requestPasswordReset` (line 438) emits `user.password_reset_requested` with only `{ userId: user.id }` — this MUST be updated to pass `{ userId: user.id, plainToken: result?.plainToken, email: user.email }` so the EmailService handler can build the reset URL without a DB lookup
- Update the event payload type in `events.types.ts` to include `plainToken?: string` and `email?: string`
- `EmailService.onPasswordResetRequested()`: renders `password-reset.hbs` with `{ resetLink, userName }` and sends
- Reset link format: `{appUrl}/auth/reset-password?token={token}` — `appUrl` comes from EmailSettings

**Definition of Done:**
- [ ] Password reset request triggers email send
- [ ] Email contains reset link with token
- [ ] Missing email config doesn't break password reset flow (token still returned)
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`

### Task 7: Welcome Email Integration

**Objective:** Send a welcome email when a new user registers.

**Dependencies:** Task 5

**Files:**
- Modify: `packages/common/src/types/events.types.ts` — update `user.registered` payload type to include `email` and `name`
- Modify: `packages/core/src/modules/auth/auth.service.ts` — update `emitEvent` call at line 116 to pass `{ userId: user.id, email: user.email, name: user.name }`
- Modify: `packages/core/src/modules/email/email.service.ts` — add `@OnEvent('user.registered')` handler

**Key Decisions / Notes:**
- `user.registered` event currently emitted in `auth.service.ts:register` with only `{ userId: user.id }` — MUST be updated to include `email` and `name` directly in the payload to avoid requiring EmailService to inject UserService
- `EmailService.onUserRegistered()`: reads `email` and `name` from payload, renders `welcome.hbs` with `{ userName, loginUrl }`, sends
- If email adapter not configured, silently skip

**Definition of Done:**
- [ ] User registration triggers welcome email
- [ ] Email contains user name and login link
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`

### Task 8: Email Verification Flow

**Objective:** Implement full email verification: token generation, verification email, and API endpoint to verify token.

**Dependencies:** Task 5, Task 7

**Files:**
- Modify: `packages/core/src/modules/user/schemas/user.schema.ts` — add `emailVerified` boolean field
- Create: `packages/core/src/modules/email/schemas/email-verification.schema.ts` — token storage
- Modify: `packages/core/src/modules/email/email.service.ts` — verification token CRUD + event handler
- Modify: `packages/core/src/modules/email/email.module.ts` — register schema
- Create: `packages/core/src/modules/email/email.controller.ts` — `GET /email/verify?token=...` endpoint
- Modify: `packages/common/src/types/events.types.ts` — add `user.email_verification_requested` event

**Key Decisions / Notes:**
- `EmailVerification` schema: `{ userId, email, tokenHash, expiresAt, used }` — follows `password-reset.schema.ts` pattern. Use the same database-agnostic `@Schema` + `@Field.*` decorators from `@magnet-cms/common` (not Mongoose-specific decorators) so it works with both Mongoose and Drizzle adapters
- After user registration (when `requireEmailVerification` is enabled in AuthSettings):
  - Generate verification token, hash it, store in DB
  - Emit `user.email_verification_requested` event
  - `EmailService` renders `email-verification.hbs` with `{ verifyLink, userName }` and sends
- `GET /email/verify?token=...`: looks up token, marks `emailVerified: true` on user, marks token used
- `emailVerified` defaults to `false` on User schema

**Definition of Done:**
- [ ] `emailVerified` field on User schema
- [ ] Verification token generated and emailed on registration (when enabled)
- [ ] `GET /email/verify?token=...` verifies email
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`

### Task 9: EmailSettings for Admin Panel

**Objective:** Create admin-configurable email settings using the `@Settings` decorator pattern.

**Dependencies:** Task 5

**Files:**
- Create: `packages/core/src/modules/email/email.settings.ts`
- Modify: `packages/core/src/modules/email/email.module.ts` — register settings

**Key Decisions / Notes:**
- Follow `auth.settings.ts` pattern exactly
- Settings group: `email`, label: "Email", icon: "mail"
- Fields:
  - `enabled` (boolean, default: true) — master toggle
  - `fromAddress` (text, required) — default sender email
  - `fromName` (text) — default sender name
  - `appUrl` (text) — base URL for links in emails (e.g., `https://myapp.com`)
  - `replyTo` (text, optional) — reply-to address
- `EmailService` reads these settings when sending

**Definition of Done:**
- [ ] Email settings appear in admin settings panel
- [ ] EmailService uses settings for from address and app URL
- [ ] No diagnostics errors

**Verify:**
- `bun run check-types`

### Task 10: E2E Tests

**Objective:** Add E2E tests verifying the email system works end-to-end.

**Dependencies:** Tasks 1-9

**Files:**
- Create: `apps/e2e/tests/api/email.spec.ts`
- Modify: `apps/e2e/src/helpers/api-client.ts` — add email-related methods

**Key Decisions / Notes:**
- Test: password reset request returns token and triggers email flow
- Test: email verification endpoint works with valid/invalid/expired tokens
- Test: email settings CRUD via API
- **Email delivery verification:** The E2E tests verify API contracts and token flows. Actual email delivery is NOT tested in E2E — it requires a running mail server. E2E tests confirm the API returns correct responses and tokens are generated/consumed correctly.
- Use `api` project in Playwright

**Definition of Done:**
- [ ] Password reset API test passes (token generation works)
- [ ] Email verification API test passes (verify endpoint accepts valid token, rejects invalid)
- [ ] Email settings API test passes
- [ ] `bun run test:e2e --project=api` passes

**Verify:**
- `bun run test:e2e --project=api`

## Deferred Ideas

- Email template management UI in admin panel (CRUD for custom templates)
- Email delivery tracking with webhooks (bounce, open, click)
- Email preview/test-send from admin
- Per-schema email triggers (e.g., "send email when blog post published")
- Queue-based email sending for high volume
