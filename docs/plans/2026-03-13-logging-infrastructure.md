# Logging Infrastructure Implementation Plan

Created: 2026-03-13
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Replace all `console.*` and `new Logger()` calls with a unified `MagnetLogger` service that supports structured logging, JSON/pretty output, request context correlation (via existing EventContext), and sensitive field redaction.

**Architecture:** New `MagnetLogger` service implementing NestJS `LoggerService` interface. Reads request context from the existing `eventContextStorage` (AsyncLocalStorage). A new `LoggingInterceptor` logs HTTP request lifecycle (start, complete, duration). `LoggingModule` registered globally in `MagnetModule`. All ~10 `console.*` calls and all ~20 `new Logger()` usages migrated to `MagnetLogger`.

**Tech Stack:** NestJS Logger interface, existing EventContextInterceptor/AsyncLocalStorage, environment variables for configuration.

## Scope

### In Scope
- Logging types in `@magnet-cms/common` (LogLevel, LogEntry, LogMetadata, ErrorLogData, LoggerConfig)
- `MagnetLogger` service with JSON/pretty formatting, log level filtering, redaction
- `LoggingInterceptor` for HTTP request/response lifecycle logging
- `LoggingModule` (global) registered in `MagnetModule`
- Migrate all `console.*` calls (~10) to MagnetLogger
- Migrate all existing `new Logger()` calls (~20+) to injected MagnetLogger
- Environment variable configuration (LOG_LEVEL, LOG_FORMAT, LOG_TIMESTAMPS, LOG_STACK_TRACES)

### Out of Scope
- External log aggregation (ELK, Datadog, etc.) — deferred
- Log persistence/storage — logs go to stdout/stderr only
- Admin UI for log viewing
- WebSocket/event-based log streaming

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - Existing `EventContextInterceptor` at `packages/core/src/modules/events/event-context.interceptor.ts` — uses `AsyncLocalStorage` with `eventContextStorage` singleton. The `getEventContext()` function retrieves the current store. MagnetLogger should call this to get requestId/userId.
  - Existing global module pattern: `EventsModule` at `packages/core/src/modules/events/events.module.ts` is `@Global()` — `LoggingModule` should follow the same pattern.
  - Global interceptor registration: `MagnetModule` at `packages/core/src/magnet.module.ts` uses `APP_FILTER`, `APP_GUARD`, `APP_PIPE` providers — add `APP_INTERCEPTOR` for `LoggingInterceptor`.
  - `MagnetModuleOptions` is already injected as a provider — use it or env vars for logger config.

- **Conventions:**
  - Existing services use `private readonly logger = new Logger(ClassName.name)` — replace with constructor-injected `MagnetLogger` and call `this.logger.setContext(ClassName.name)`.
  - Static logger in module classes (e.g., `UserModule`) uses `private static readonly logger = new Logger(UserModule.name)` — these need special handling since DI isn't available for static members.
  - Types go in `packages/common/src/types/` and are exported from `packages/common/src/index.ts`.

- **Key files:**
  - `packages/core/src/magnet.module.ts` — main module, registers global providers
  - `packages/core/src/modules/events/event-context.interceptor.ts` — existing AsyncLocalStorage with requestId, userId, ipAddress
  - `packages/core/src/handlers/global-exception.filter.ts` — already uses `new Logger()`, needs migration
  - `packages/common/src/index.ts` — barrel export for common package

- **Gotchas:**
  - `MagnetLogger` must implement NestJS `LoggerService` interface to be usable as app-level logger
  - `Scope.TRANSIENT` means a new instance per injection — needed so each service gets its own context string
  - Static loggers (`private static readonly logger`) cannot use DI — keep as `new Logger()` or use a static factory
  - The `EventContextInterceptor` is registered in `EventsModule` — `LoggingInterceptor` is separate and registers via `APP_INTERCEPTOR`
  - `ConfigService` from `@nestjs/config` is NOT used in this project — read env vars directly via `process.env`

## Runtime Environment

- **Start command:** `bun run dev` (runs all packages including example apps)
- **Port:** 3000 (NestJS default in example apps)
- **Type check:** `bun run check-types`
- **Lint:** `bun run lint`

## Assumptions

- `process.env` is the correct way to read config — supported by the fact that `ConfigService` is not imported anywhere in `packages/core` — All tasks depend on this
- `eventContextStorage` from `event-context.interceptor.ts` is populated for every HTTP request — supported by `EventContextInterceptor` being registered globally — Tasks 2, 4 depend on this
- NestJS `LoggerService` interface requires `log`, `error`, `warn`, `debug?`, `verbose?` methods — Tasks 2, 3 depend on this
- Services with `private static readonly logger` (UserModule, AdminServeModule) cannot use DI injection — Task 6 needs special handling for these
- Module factory loggers (`settings.module.ts`, `activity.module.ts`) use `new Logger()` inside factory callbacks where DI is unavailable — Task 6 documents these as exceptions
- `LocalStorageAdapter` is NOT `@Injectable()` (verified: no decorator) — constructed manually in a factory, keep `new Logger()` — Task 6 depends on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| MagnetLogger breaks app bootstrap (before DI is ready) | Medium | High | Implement `static create()` factory for pre-DI usage; test bootstrap explicitly |
| Transient scope causes performance issues | Low | Low | Logger is lightweight; profile if needed |
| Circular dependency with EventsModule | Medium | High | LoggingModule does NOT import EventsModule — it reads from the exported `eventContextStorage` singleton directly |
| Migration breaks existing log format consumers | Low | Medium | Keep pretty format as default; JSON only when LOG_FORMAT=json |

## Goal Verification

### Truths
1. Zero `console.*` calls in production code (except inside MagnetLogger's output method)
2. All services use MagnetLogger instead of `new Logger()`
3. Log entries include requestId when called within HTTP request context
4. `LOG_LEVEL=error` suppresses info/warn/debug/verbose output
5. `LOG_FORMAT=json` produces valid JSON log lines
6. Sensitive fields (password, token, apiKey, secret) are redacted in log metadata
7. HTTP requests are logged with method, path, status code, and duration

### Artifacts
- `packages/common/src/types/logging.types.ts` — type definitions
- `packages/core/src/modules/logging/logger.service.ts` — MagnetLogger
- `packages/core/src/modules/logging/logging.interceptor.ts` — HTTP logging
- `packages/core/src/modules/logging/logging.module.ts` — global module
- All migrated service files

## Progress Tracking

- [x] Task 1: Logging Types
- [x] Task 2: MagnetLogger Service
- [x] Task 3: LoggingModule & Global Registration
- [x] Task 4: HTTP Logging Interceptor
- [x] Task 5: Migrate console.* Calls
- [x] Task 6: Migrate Existing Logger Calls
- [x] Task 7: E2E & Unit Tests

**Total Tasks:** 7 | **Completed:** 7 | **Remaining:** 0

## Implementation Tasks

### Task 1: Logging Types

**Objective:** Define all logging type definitions in `@magnet-cms/common`.
**Dependencies:** None

**Files:**
- Create: `packages/common/src/types/logging.types.ts`
- Modify: `packages/common/src/index.ts` (add export)

**Key Decisions / Notes:**
- `LogLevel` enum: error, warn, info, debug, verbose (matches NestJS levels)
- `LogEntry` interface: level, message, timestamp, context, requestId?, userId?, metadata?, error?
- `LogMetadata`: operation?, schema?, resourceId?, duration?, method?, path?, statusCode?, `[key: string]: unknown`
- `ErrorLogData`: name, message, code?, stack?
- `LoggerConfig`: level, format (json|pretty), timestamps, stackTraces, redactFields

**Definition of Done:**
- [ ] All types exported from `@magnet-cms/common`
- [ ] `bun run check-types` passes

**Verify:**
- `cd packages/core && bunx tsc --noEmit`

---

### Task 2: MagnetLogger Service

**Objective:** Create the core `MagnetLogger` implementing NestJS `LoggerService` with structured output, context enrichment, and field redaction.
**Dependencies:** Task 1

**Files:**
- Create: `packages/core/src/modules/logging/logger.service.ts`
- Create: `packages/core/src/modules/logging/logger.service.test.ts`

**Key Decisions / Notes:**
- Implements `LoggerService` from `@nestjs/common` (methods: `log`, `error`, `warn`, `debug`, `verbose`)
- `@Injectable({ scope: Scope.TRANSIENT })` — each injection gets its own instance with its own context
- Reads request context via `getEventContext()` from `~/modules/events/event-context.interceptor` (no module import needed, just the function)
- Config loaded from `process.env` (LOG_LEVEL, LOG_FORMAT, LOG_TIMESTAMPS, LOG_STACK_TRACES)
- Default: level=info, format=pretty, timestamps=true, stackTraces=true
- Redact fields: password, token, apiKey, secret, authorization
- `setContext(context: string)` method for setting the logger name
- `child(context: string)` returns a new instance with `parent:child` context
- `formatJson()` outputs single-line JSON; `formatPretty()` outputs colored human-readable format
- Unit tests with `bun:test` for: log level filtering, JSON format, pretty format, redaction, context enrichment

**Definition of Done:**
- [ ] MagnetLogger implements LoggerService
- [ ] Log level filtering works (error < warn < info < debug < verbose)
- [ ] JSON format produces valid JSON
- [ ] Sensitive fields are redacted
- [ ] Unit tests pass
- [ ] `bun run check-types` passes

**Verify:**
- `bun test packages/core/src/modules/logging/logger.service.test.ts`
- `cd packages/core && bunx tsc --noEmit`

---

### Task 3: LoggingModule & Global Registration

**Objective:** Create the LoggingModule and register it globally in MagnetModule.
**Dependencies:** Task 2

**Files:**
- Create: `packages/core/src/modules/logging/logging.module.ts`
- Create: `packages/core/src/modules/logging/index.ts`
- Modify: `packages/core/src/magnet.module.ts` (add LoggingModule to imports)

**Key Decisions / Notes:**
- `@Global() @Module({...})` pattern — same as EventsModule
- Exports `MagnetLogger`
- Added to `imports` array in `MagnetModule.forRoot()`
- Follow pattern at `packages/core/src/modules/events/events.module.ts`

**Definition of Done:**
- [ ] LoggingModule is global
- [ ] MagnetLogger is injectable in any module
- [ ] `bun run check-types` passes

**Verify:**
- `cd packages/core && bunx tsc --noEmit`

---

### Task 4: HTTP Logging Interceptor

**Objective:** Create an interceptor that logs HTTP request start and completion with duration.
**Dependencies:** Task 3

**Files:**
- Create: `packages/core/src/modules/logging/logging.interceptor.ts`
- Modify: `packages/core/src/magnet.module.ts` (add APP_INTERCEPTOR provider)
- Modify: `packages/core/src/modules/logging/logging.module.ts` (add LoggingInterceptor to providers/exports)
- Modify: `packages/core/src/modules/logging/index.ts` (export LoggingInterceptor)

**Key Decisions / Notes:**
- Uses `APP_INTERCEPTOR` token for global registration (same pattern as APP_FILTER, APP_GUARD)
- Injects `MagnetLogger`, calls `setContext('HTTP')`
- Logs: `Request started` with method, path, ip on entry
- Logs: `Request completed` with method, path, statusCode, duration on success
- Logs: `Request failed` with error on failure
- Does NOT duplicate EventContextInterceptor's AsyncLocalStorage setup — it only reads from it
- Add `APP_INTERCEPTOR` to providers in `MagnetModule.forRoot()`: `{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }`

**Definition of Done:**
- [ ] Interceptor logs request lifecycle
- [ ] Duration calculated correctly
- [ ] Registered globally via APP_INTERCEPTOR
- [ ] `bun run check-types` passes

**Verify:**
- `cd packages/core && bunx tsc --noEmit`

---

### Task 5: Migrate console.* Calls

**Objective:** Replace all `console.*` calls in production code with MagnetLogger.
**Dependencies:** Task 3

**Files to modify (actual console.* calls, not JSDoc examples):**
- `packages/core/src/modules/admin/admin.controller.ts:33` — `console.error`
- `packages/core/src/modules/database/modules/internationalization/internationalization.service.ts:42` — `console.error`
- `packages/core/src/modules/history/history.module.ts:36` — `console.error` (already migrated to Logger in our History spec, verify)
- `packages/core/src/modules/history/history.service.ts:214` — `console.error`
- `packages/core/src/modules/content/content.service.ts:175` — `console.warn`
- `packages/core/src/modules/plugin/plugin-registry.service.ts:45` — `console.warn`
- `packages/core/src/modules/plugin/plugin.service.ts:123` — `console.error`
- `packages/adapters/drizzle/src/drizzle.adapter.ts:93` — `console.warn`
- `packages/adapters/mongoose/src/mongoose.model.ts:174` — `console.error`

**Key Decisions / Notes:**
- For files that already inject MagnetLogger (from Task 6), just change the call
- For adapter files (`drizzle.adapter.ts`, `mongoose.model.ts`): these are in separate packages — use `new Logger(ClassName.name)` (NestJS Logger) since MagnetLogger is in `@magnet-cms/core` and adapters can't import core. This is acceptable — the adapters are a boundary.
- For module factory files (e.g., `history.module.ts`): use `new Logger('ModuleName')` since DI isn't available in factory functions
- Skip JSDoc examples (lines that are inside `* console.log(...)` comments)

**Definition of Done:**
- [ ] Zero `console.*` calls in production code (outside of MagnetLogger itself and adapters)
- [ ] Adapter files use NestJS Logger instead of console.*
- [ ] `bun run check-types` passes
- [ ] `bun run lint` passes (for modified packages)

**Verify:**
- `grep -rn "console\.\(log\|warn\|error\)" --include="*.ts" packages/core/src/ | grep -v "node_modules\|dist\|\.d\.ts\|test\.\|spec\.\| \*\| \*\*\|//"`
- `cd packages/core && bunx tsc --noEmit`

---

### Task 6: Migrate Existing Logger Calls

**Objective:** Replace all `new Logger(ClassName.name)` instances with injected MagnetLogger across all services.
**Dependencies:** Task 3

**Files to modify (~20+ services):**
- `packages/core/src/handlers/global-exception.filter.ts`
- `packages/core/src/modules/auth/services/password-reset.service.ts`
- `packages/core/src/modules/auth/auth.service.ts`
- `packages/core/src/modules/user/user-extension.service.ts`
- `packages/core/src/modules/user/user.module.ts` (static — special handling)
- `packages/core/src/modules/admin/admin.service.ts`
- `packages/core/src/modules/rbac/services/permission.service.ts`
- `packages/core/src/modules/rbac/services/role.service.ts`
- `packages/core/src/modules/rbac/guards/permission.guard.ts`
- `packages/core/src/modules/admin-serve/admin-serve.module.ts` (static — special handling)
- `packages/core/src/modules/storage/storage.service.ts`
- `packages/core/src/modules/storage/adapters/local-storage.adapter.ts`
- `packages/core/src/modules/api-keys/guards/api-key.guard.ts`
- `packages/core/src/modules/api-keys/api-keys.service.ts`
- `packages/core/src/modules/activity/activity.service.ts`
- `packages/core/src/modules/activity/activity.module.ts`
- `packages/core/src/modules/content/content.service.ts`
- `packages/core/src/modules/plugin/plugin-assets.controller.ts`
- `packages/core/src/modules/plugin/plugin-lifecycle.service.ts`
- `packages/core/src/modules/events/event.service.ts`
- `packages/core/src/modules/settings/settings.service.ts`
- `packages/core/src/modules/events/event-handler-discovery.service.ts`

**Key Decisions / Notes:**
- Pattern: Replace `private readonly logger = new Logger(X.name)` with constructor-injected `private readonly logger: MagnetLogger` and add `this.logger.setContext(X.name)` in constructor
- For `@Injectable()` services: add `MagnetLogger` to constructor params
- For guards: same — guards support DI
- For static loggers in module classes (`UserModule`, `AdminServeModule`): keep as `new Logger()` since DI isn't available for static contexts
- For module factory loggers (`settings.module.ts`, `activity.module.ts`): keep as `new Logger('ModuleName')` — these use `new Logger()` inside DI factory callbacks or module initialization, not in injectable class fields
- For `GlobalExceptionFilter`: it's registered via `APP_FILTER` which supports DI — inject MagnetLogger
- For `LocalStorageAdapter`: not `@Injectable()`, constructed manually in a factory — keep `new Logger()` (verified: no `@Injectable()` decorator)
- LoggingModule is `@Global()` so no module imports needed

**Definition of Done:**
- [ ] All `@Injectable()` services use injected MagnetLogger
- [ ] Static loggers documented as exceptions
- [ ] `bun run check-types` passes
- [ ] No runtime errors from missing injections

**Verify:**
- `grep -rn "new Logger(" --include="*.ts" packages/core/src/ | grep -v "node_modules\|dist\|\.d\.ts\|test\.\|spec\.\|MagnetLogger\| \*\| \*\*\|//"` — should only show documented exceptions: `user.module.ts` (static), `admin-serve.module.ts` (static), `settings.module.ts` (factory), `activity.module.ts` (factory), `local-storage.adapter.ts` (non-DI)
- `cd packages/core && bunx tsc --noEmit`

---

### Task 7: E2E & Unit Tests

**Objective:** Add E2E tests verifying logging infrastructure works end-to-end, and unit tests verifying LoggingInterceptor behavior.
**Dependencies:** Tasks 4, 5, 6

**Files:**
- Create: `apps/e2e/tests/api/logging.spec.ts`
- Create: `packages/core/src/modules/logging/__tests__/logging.interceptor.test.ts`
- Modify: `apps/e2e/src/helpers/api-client.ts` (if needed for new endpoints)

**Key Decisions / Notes:**
- E2E: Test that `x-request-id` header is returned in HTTP responses (set by EventContextInterceptor)
- E2E: Test that a custom `x-request-id` header is echoed back
- E2E: Test that HTTP requests complete successfully with LoggingInterceptor registered (verify interceptor doesn't break request handling — standard endpoint returns 200)
- Unit: Test LoggingInterceptor by mocking ExecutionContext and verifying it calls MagnetLogger.log with method/path/statusCode/duration metadata
- Unit: Test that interceptor passes through even when logger throws (resilient logging)
- No stdout log output verification in E2E (not easily capturable) — focus on observable effects and unit-level behavior verification

**Definition of Done:**
- [ ] E2E tests verify x-request-id header presence and correlation
- [ ] E2E tests verify HTTP requests succeed with LoggingInterceptor active
- [ ] Unit tests verify LoggingInterceptor calls MagnetLogger with request metadata
- [ ] Tests pass
- [ ] `bun run check-types` passes

**Verify:**
- `bun run test:e2e --project=api -- tests/api/logging.spec.ts`
- `cd packages/core && bun test src/modules/logging/__tests__/logging.interceptor.test.ts`
