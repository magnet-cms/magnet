# Sentry Plugin Implementation Plan

Created: 2026-03-20
Status: VERIFIED
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Create a `@magnet-cms/plugin-sentry` package that provides Sentry error tracking, performance monitoring, cron job monitoring, and a user feedback widget for Magnet CMS applications — following the existing plugin pattern (like Stripe/Polar).

**Architecture:** A plugin package at `packages/plugins/sentry/` with both backend (NestJS module with Sentry SDK integration) and frontend (admin UI feedback widget). The plugin registers via `SentryPlugin.forRoot()` in the providers array, decorates the existing `GlobalExceptionFilter` with `@SentryExceptionCaptured()` for error capture, and provides performance tracing and cron monitoring utilities.

**Tech Stack:** `@sentry/nestjs`, `@sentry/profiling-node` (optional peer dep), `@sentry/browser` (frontend feedback widget), NestJS, React

## Scope

### In Scope

- **Error tracking**: Auto-capture unhandled exceptions via `@SentryExceptionCaptured()` on `GlobalExceptionFilter`, enriched with user context, request data, and breadcrumbs
- **Performance monitoring**: HTTP request tracing, custom span instrumentation helper, `tracesSampleRate` configuration
- **Cron monitoring**: Re-export `@SentryCron` decorator for scheduled task monitoring
- **User feedback widget**: Frontend component rendered in admin UI via plugin system
- **Plugin configuration**: `SentryPlugin.forRoot()` with typed config, auto env var resolution (`SENTRY_DSN`)
- **Documentation**: MDX docs in `apps/docs/content/docs/plugins/sentry.mdx`
- **create-magnet CLI**: Add Sentry as an optional plugin choice in scaffolding

### Out of Scope

- Session replay (heavy frontend dependency, can be added later)
- Sentry release/deploy tracking (CI/CD concern, not plugin responsibility)
- Custom Sentry dashboards or API endpoints (Sentry's own UI handles this)
- Source map upload automation (build tooling concern)
- Profiling integration (`@sentry/profiling-node` — documented as optional peer dep only)

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Plugin pattern to follow:** `packages/plugins/stripe/` — the Stripe plugin is the canonical reference. Study `src/plugin.ts` (plugin definition + `forRoot()`), `src/stripe.module.ts` (NestJS module), `src/index.ts` (exports), `src/admin/index.ts` (frontend entry), `package.json` (dual backend/frontend build), `tsup.config.ts`, `vite.config.ts`
- **Provider type system:** `packages/common/src/types/provider.types.ts:151-157` — `PluginMagnetProvider` is the discriminated union variant for plugins. `forRoot()` must return this type.
- **Plugin decorator:** `packages/core/src/modules/plugin/decorators/plugin.decorator.ts` — `@Plugin()` marks a class as a Magnet plugin with metadata, optional frontend manifest, and optional NestJS module.
- **Plugin lifecycle:** `packages/core/src/modules/plugin/plugin-lifecycle.service.ts` — calls `onPluginInit()` during `OnModuleInit` and `onPluginDestroy()` during `OnApplicationShutdown`. This is where `Sentry.init()` will be called.
- **Exception filter:** `packages/core/src/handlers/global-exception.filter.ts` — the `GlobalExceptionFilter` handles all exceptions. We'll add `@SentryExceptionCaptured()` to its `catch()` method, which requires `@sentry/nestjs` as a peer dep of `@magnet-cms/core` (optional).
- **Event context:** `packages/core/src/modules/events/event-context.interceptor.ts` — `AsyncLocalStorage`-based request context with `requestId`, `userId`, `ipAddress`. The Sentry plugin will use this to enrich Sentry scope with user/request data.
- **Logging interceptor:** `packages/core/src/modules/logging/logging.interceptor.ts` — existing HTTP request logging. Sentry performance tracing complements (not replaces) this.
- **Frontend plugin system:** Plugins self-register on `window.__MAGNET_PLUGINS__` with a manifest and lazy-loaded components. See `packages/plugins/stripe/src/admin/index.ts`.
- **Gotchas:**
  - `Sentry.init()` is called in `onPluginInit()` — this happens AFTER NestJS bootstrap, so auto-instrumentation of already-loaded modules (HTTP, DB drivers) may not fully work. Document this trade-off and recommend the `instrument.ts` pattern for full perf tracing.
  - The `@SentryExceptionCaptured()` decorator is from `@sentry/nestjs` — it requires Sentry to be initialized. If the plugin is not installed, the decorator must be conditionally applied or the import must be optional.
  - The `GlobalExceptionFilter` is in `@magnet-cms/core` — modifying it creates a dependency from core on `@sentry/nestjs`. Use optional peer dependency + conditional import to avoid hard coupling.

## Runtime Environment

- **Start command:** `bun run dev` (monorepo) or `bun run dev` in example apps
- **Port:** 3000 (default)
- **Health check:** `GET /health`

## Assumptions

- `@sentry/nestjs` provides `SentryExceptionCaptured` decorator that works on any `ExceptionFilter.catch()` method — supported by Sentry docs. Tasks 2, 3 depend on this.
- `@sentry/nestjs` can be initialized in `onPluginInit()` (late init) and still capture exceptions via `captureException()` — supported by Sentry SDK behavior. Task 2 depends on this. Performance auto-instrumentation may be limited.
- The existing `@Plugin` decorator and `PluginLifecycleService` support `onPluginInit` and `onPluginDestroy` lifecycle hooks — verified in `plugin-lifecycle.service.ts:63-75`. Task 2 depends on this.
- `@sentry/browser` exports a feedback integration usable in React — supported by Sentry docs. Task 6 depends on this.
- Optional peer dependencies in `@magnet-cms/core` for `@sentry/nestjs` won't break installations where Sentry is not used — standard npm/bun behavior. Task 3 depends on this.
- `create-magnet` CLI files exist at `packages/create-magnet/src/prompts.ts` and `packages/create-magnet/src/generators/app-module.ts` — verified during exploration (Probe search results). Task 7 depends on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Late `Sentry.init()` in `onPluginInit()` limits auto-instrumentation | High | Medium | Document trade-off. Export `initSentryInstrumentation()` helper for users who want early init. Manual `Sentry.captureException()` still works. |
| Adding `@SentryExceptionCaptured()` to core creates optional coupling | Medium | Medium | Use dynamic import with try/catch. Only apply decorator if `@sentry/nestjs` is installed. Core continues to work without it. |
| Frontend feedback widget may conflict with admin UI styles | Low | Low | Use Sentry's shadow DOM-based widget which is style-isolated. |
| `@sentry/nestjs` version drift | Low | Medium | Pin to `^9.0.0` as peer dep. Document supported version range. |

## Goal Verification

### Truths

1. `SentryPlugin.forRoot({ dsn: '...' })` is accepted in `MagnetModule.forRoot()` providers array without errors
2. Unhandled exceptions in any controller are captured by Sentry (visible in Sentry dashboard or via mocked `captureException`)
3. User context (userId, IP, requestId) is attached to Sentry events
4. `@SentryCron` decorator can be applied to scheduled tasks and check-ins are sent
5. The feedback widget renders in the admin UI when the plugin frontend is loaded
6. `bun run check-types` passes across the entire monorepo
7. The plugin works when installed (no runtime errors on bootstrap)

### Artifacts

1. `packages/plugins/sentry/src/plugin.ts` — Plugin definition with `forRoot()` and lifecycle hooks
2. `packages/plugins/sentry/src/sentry.module.ts` — NestJS module registering interceptors
3. `packages/core/src/handlers/global-exception.filter.ts` — Modified with conditional `@SentryExceptionCaptured()`
4. `packages/plugins/sentry/src/admin/index.ts` — Frontend entry with feedback widget
5. `apps/docs/content/docs/plugins/sentry.mdx` — Documentation

## Progress Tracking

- [x] Task 1: Package scaffolding and configuration types
- [x] Task 2: Plugin definition with `forRoot()` and `Sentry.init()` lifecycle
- [x] Task 3: Error tracking — integrate with GlobalExceptionFilter
- [x] Task 4: Performance monitoring — tracing interceptor and span helpers
- [x] Task 5: Cron monitoring — re-export and configure `@SentryCron`
- [x] Task 6: User feedback widget — frontend admin component
- [x] Task 7: Documentation and create-magnet CLI integration
- [x] Task 8: E2E testing

**Total Tasks:** 8 | **Completed:** 8 | **Remaining:** 0

## Implementation Tasks

### Task 1: Package Scaffolding and Configuration Types

**Objective:** Create the `@magnet-cms/plugin-sentry` package with build tooling, dependencies, and typed configuration interface.

**Dependencies:** None

**Files:**

- Create: `packages/plugins/sentry/package.json`
- Create: `packages/plugins/sentry/tsconfig.json`
- Create: `packages/plugins/sentry/tsup.config.ts`
- Create: `packages/plugins/sentry/vite.config.ts`
- Create: `packages/plugins/sentry/src/index.ts`
- Create: `packages/plugins/sentry/src/types.ts`

**Key Decisions / Notes:**

- Follow `packages/plugins/stripe/package.json` structure exactly — dual exports (`.`, `./backend`, `./frontend`), `magnet.type: "plugin"`, same devDependencies pattern
- `@sentry/nestjs` as peer dependency (`^9.0.0`)
- `@sentry/browser` as devDependency (only used in frontend build)
- TypeScript config extends `@repo/typescript-config`
- `SentryPluginConfig` interface with: `dsn`, `tracesSampleRate`, `profileSessionSampleRate`, `environment`, `release`, `debug`, `enabled`, `beforeSend`, `integrations`, `attachStacktrace`, `maxBreadcrumbs`
- All config fields optional — DSN auto-resolved from `SENTRY_DSN` env var
- **Type safety:** Do NOT copy Stripe's `as unknown as Record<string, unknown>` cast pattern — this violates project conventions. Instead, store resolved config on a static field (`SentryPlugin._resolvedConfig`) and inject it in `SentryModule` via a typed provider token (`SENTRY_OPTIONS` typed as `SentryPluginConfig`). The `PluginMagnetProvider.options` field can remain `Record<string, unknown>` but internal code should use the typed token.

**Definition of Done:**

- [ ] `bun install` succeeds in monorepo
- [ ] `bun run check-types` passes
- [ ] Package structure matches Stripe plugin pattern
- [ ] No `as unknown as T` casts in plugin.ts

**Verify:**

- `cd /home/gjsoa/code/magnet && bun install && bun run check-types`

---

### Task 2: Plugin Definition with forRoot() and Sentry.init() Lifecycle

**Objective:** Create the `SentryPlugin` class with `@Plugin` decorator, `forRoot()` static method returning `PluginMagnetProvider`, and `onPluginInit()`/`onPluginDestroy()` lifecycle hooks that call `Sentry.init()` and `Sentry.close()`.

**Dependencies:** Task 1

**Files:**

- Create: `packages/plugins/sentry/src/plugin.ts`
- Create: `packages/plugins/sentry/src/sentry.module.ts`
- Modify: `packages/plugins/sentry/src/index.ts`

**Key Decisions / Notes:**

- `@Plugin({ name: 'sentry', module: () => require('./sentry.module').SentryModule })` — lazy module load like Stripe
- **Config access pattern:** `forRoot()` stores resolved config on a static field `SentryPlugin._resolvedConfig`. The `onPluginInit()` lifecycle hook reads from this static field to call `Sentry.init()`. This avoids needing NestJS DI in the plugin class instance (the lifecycle service creates/finds the instance outside normal DI flow — see `plugin-lifecycle.service.ts:48-59`).
- `onPluginInit()` calls `Sentry.init()` with the static resolved config. Check `Sentry.getClient()` first to avoid double-init if user also uses `instrument.ts`
- `onPluginDestroy()` calls `Sentry.close(2000)` for graceful flush
- `forRoot()` returns `PluginMagnetProvider` with `envVars: [{ name: 'SENTRY_DSN', required: true }]`
- Export `initSentryInstrumentation(config?)` helper for users who want early init (before NestJS bootstrap) — this is the recommended path for full performance tracing
- `SentryModule` is a basic NestJS module that will register providers/interceptors in subsequent tasks. It provides `SENTRY_OPTIONS` token typed as `SentryPluginConfig` by reading `SentryPlugin._resolvedConfig`.

**Definition of Done:**

- [ ] `SentryPlugin.forRoot()` returns valid `PluginMagnetProvider`
- [ ] `SentryPlugin.forRoot({ dsn: 'test' })` resolves config correctly
- [ ] `SentryPlugin.forRoot()` without dsn resolves from `process.env.SENTRY_DSN`
- [ ] `bun run check-types` passes

**Verify:**

- `bun run check-types`

---

### Task 3: Error Tracking — Integrate with GlobalExceptionFilter

**Objective:** Modify the existing `GlobalExceptionFilter` to conditionally apply Sentry's `@SentryExceptionCaptured()` decorator when `@sentry/nestjs` is installed, and add a Sentry scope interceptor in the plugin module that enriches events with user context from `EventContext`.

**Dependencies:** Task 2

**Files:**

- Modify: `packages/core/src/handlers/global-exception.filter.ts`
- Create: `packages/plugins/sentry/src/interceptors/sentry-context.interceptor.ts`
- Modify: `packages/plugins/sentry/src/sentry.module.ts`

**Key Decisions / Notes:**

- **Approach: `@SentryExceptionCaptured()` on `GlobalExceptionFilter.catch()`** (user's explicit choice). Implementation:
  1. Add `@sentry/nestjs` as an **optional** peer dependency of `@magnet-cms/core` (in package.json `peerDependenciesMeta` with `optional: true`)
  2. Use a **conditional dynamic import** in `GlobalExceptionFilter`: try to `require('@sentry/nestjs')` at module load time, wrapped in try/catch. If available, apply `@SentryExceptionCaptured()` decorator to the `catch()` method programmatically via `Reflect.defineMetadata` or call `Sentry.captureException(exception)` directly inside `catch()` guarded by a null check on `Sentry.getClient()`
  3. Simplest safe implementation: Add `Sentry.captureException(exception)` call inside `catch()` method, guarded by `try { const Sentry = require('@sentry/nestjs'); if (Sentry.getClient()) Sentry.captureException(exception) } catch {}`. This captures to Sentry when installed, is a no-op when not installed, and requires no decorator magic.
  4. Core continues to work unchanged when `@sentry/nestjs` is not installed — the try/catch ensures zero impact
- `SentryContextInterceptor` (registered in `SentryModule` as `APP_INTERCEPTOR`): Runs on every request, calls `Sentry.setUser({ id, ip_address })` and `Sentry.setTag('requestId', ...)` using data from `getEventContext()`
- Breadcrumbs: Add breadcrumbs for key Magnet events (content CRUD, auth, etc.) via the event system

**Definition of Done:**

- [ ] Exceptions thrown in controllers are captured by Sentry (verified via mock)
- [ ] Sentry events include `user.id`, `user.ip_address`, and `requestId` tag
- [ ] `GlobalExceptionFilter` response behavior is unchanged
- [ ] `bun run check-types` passes

**Verify:**

- `bun run check-types`

---

### Task 4: Performance Monitoring — Tracing Interceptor and Span Helpers

**Objective:** Add HTTP request performance tracing and provide helper utilities for creating custom spans in user code.

**Dependencies:** Task 2

**Files:**

- Create: `packages/plugins/sentry/src/helpers/span.ts`
- Create: `packages/plugins/sentry/src/decorators/sentry-span.decorator.ts`
- Modify: `packages/plugins/sentry/src/sentry.module.ts`
- Modify: `packages/plugins/sentry/src/index.ts`

**Key Decisions / Notes:**

- `@sentry/nestjs` auto-instruments HTTP requests when `tracesSampleRate > 0` — no custom interceptor needed for basic HTTP tracing
- Export `SentrySpan` method decorator that wraps a method in `Sentry.startSpan()` — syntactic sugar for custom instrumentation:
  ```ts
  @SentrySpan('my-operation')
  async processData() { ... }
  ```
- Export `withSentrySpan(name, op, fn)` utility function for non-decorator usage
- These helpers are thin wrappers over `Sentry.startSpan()` — they add value by providing a consistent API and TypeScript types

**Definition of Done:**

- [ ] `@SentrySpan()` decorator wraps method execution in a Sentry span
- [ ] `withSentrySpan()` utility creates spans programmatically
- [ ] Helpers are no-ops when Sentry is not initialized (graceful degradation)
- [ ] `bun run check-types` passes

**Verify:**

- `bun run check-types`

---

### Task 5: Cron Monitoring — Re-export and Configure @SentryCron

**Objective:** Re-export `@SentryCron` from `@sentry/nestjs` and provide a typed wrapper with Magnet conventions.

**Dependencies:** Task 2

**Files:**

- Create: `packages/plugins/sentry/src/decorators/sentry-cron.decorator.ts`
- Modify: `packages/plugins/sentry/src/index.ts`

**Key Decisions / Notes:**

- Re-export `SentryCron` from `@sentry/nestjs` directly — no need to wrap it, just re-export for convenience so users import from one place
- Provide a `MagnetSentryCron` wrapper (optional) that auto-generates monitor slugs from class+method name if not provided
- Document that `@SentryCron` must be applied AFTER `@Cron()` from `@nestjs/schedule`
- `@nestjs/schedule` is NOT a dependency of this plugin — it's a peer suggestion documented in README

**Definition of Done:**

- [ ] `SentryCron` re-exported from plugin package
- [ ] `MagnetSentryCron` wrapper generates slug from method name
- [ ] `bun run check-types` passes

**Verify:**

- `bun run check-types`

---

### Task 6: User Feedback Widget — Frontend Admin Component

**Objective:** Create a frontend plugin component that renders the Sentry user feedback widget in the admin UI.

**Dependencies:** Task 1

**Files:**

- Create: `packages/plugins/sentry/src/admin/index.ts`
- Create: `packages/plugins/sentry/src/admin/components/feedback-widget.tsx`
- Create: `packages/plugins/sentry/src/admin/pages/sentry-settings.tsx`

**Key Decisions / Notes:**

- Follow `packages/plugins/stripe/src/admin/index.ts` pattern for self-registration on `window.__MAGNET_PLUGINS__`
- The feedback widget uses `@sentry/browser`'s `feedbackIntegration()` — it renders a floating button that opens a dialog for users to report issues
- The widget component checks if Sentry Browser SDK is available (it may need to be initialized client-side separately from the backend SDK)
- Settings page: Simple page showing Sentry connection status, DSN (masked), and a toggle for the feedback widget position
- Frontend manifest: sidebar item under a "Monitoring" section, settings page for configuration
- **Important:** The Sentry Browser SDK (`@sentry/browser`) is a separate init from the NestJS backend SDK. The frontend widget needs its own DSN configuration (same DSN, but client-side init). This will be handled via a backend API endpoint that exposes the public DSN.
- Create an API endpoint in `SentryModule` at `GET /sentry/config` that returns `{ dsn: publicDsn, enabled: true }` for the frontend to initialize
- **Access control for `/sentry/config`:** This endpoint should require authentication (use existing `@UseGuards(JwtAuthGuard)` or equivalent). Sentry DSNs are not truly secret (they're embedded in client-side bundles by design), but limiting exposure to authenticated admin users is best practice. Add a code comment explaining the rationale.

**Definition of Done:**

- [ ] Frontend bundle builds without errors (`bun run build:frontend` in plugin dir)
- [ ] Plugin self-registers on `window.__MAGNET_PLUGINS__`
- [ ] Feedback widget component renders (verified via build, not runtime — runtime tested in Task 8)
- [ ] `GET /sentry/config` endpoint requires authentication and returns `{ dsn, enabled }` shape
- [ ] `bun run check-types` passes

**Verify:**

- `cd packages/plugins/sentry && bun run build`

---

### Task 7: Documentation and create-magnet CLI Integration

**Objective:** Write MDX documentation for the Sentry plugin and add it as an optional choice in the `create-magnet` CLI scaffolding tool.

**Dependencies:** Tasks 1-6

**Files:**

- Create: `apps/docs/content/docs/plugins/sentry.mdx`
- Modify: `apps/docs/content/docs/plugins/meta.json` (add sentry page to navigation)
- Modify: `packages/create-magnet/src/prompts.ts` (add Sentry plugin option)
- Modify: `packages/create-magnet/src/generators/app-module.ts` (generate Sentry imports/config)

**Key Decisions / Notes:**

- Documentation covers: installation, basic setup, configuration options, error tracking, performance monitoring, cron monitoring, feedback widget, advanced configuration (early init via `instrument.ts`)
- Prominently document the `instrument.ts` approach for full performance tracing as the recommended setup for production
- `create-magnet` CLI: Add "Sentry (Error Tracking & Performance)" as a plugin choice. When selected, generate `SentryPlugin.forRoot()` in the providers array and add `SENTRY_DSN` to `.env.example`
- Follow existing docs structure — see `apps/docs/content/docs/plugins/seo.mdx` and `playground.mdx` for format

**Definition of Done:**

- [ ] MDX doc renders without errors in docs site
- [ ] Navigation includes Sentry plugin page
- [ ] `create-magnet` scaffolds Sentry when selected
- [ ] `bun run check-types` passes

**Verify:**

- `bun run check-types`

---

### Task 8: E2E Testing

**Objective:** Write E2E tests verifying the Sentry plugin integrates correctly with a Magnet CMS application.

**Dependencies:** Tasks 1-6

**Files:**

- Create: `apps/e2e/tests/api/sentry-plugin.spec.ts`

**Key Decisions / Notes:**

- **Testing strategy (two layers):**
  1. **Playwright E2E tests** (`apps/e2e/tests/api/sentry-plugin.spec.ts`): Test against a real running server with `SENTRY_DSN` set to a dummy value (Sentry won't connect but SDK initializes). Verify: app bootstraps without errors, `GET /sentry/config` returns expected shape (requires auth), and unhandled exceptions don't crash the server.
  2. **Unit tests** (`packages/plugins/sentry/src/__tests__/`): Test `SentryPlugin.forRoot()` config resolution, `SentrySpan` decorator behavior, and `withSentrySpan` helper with mocked Sentry SDK. These verify internal logic without needing a running server.
- Don't test actual Sentry connectivity (external service) — use a dummy DSN that passes validation but doesn't transmit
- Use existing E2E test patterns from `apps/e2e/tests/api/`

**Definition of Done:**

- [ ] All E2E tests pass — app bootstraps with Sentry plugin without errors
- [ ] `GET /sentry/config` endpoint returns expected shape (auth-protected)
- [ ] Unit tests verify forRoot() config resolution and helper utilities
- [ ] `bun run check-types` passes

**Verify:**

- `bun run test:e2e --project=api`

## Open Questions

1. **Should the plugin expose a `/sentry/tunnel` endpoint?** Sentry tunnel proxies client-side events through the backend to avoid ad blockers. Could be a follow-up feature.
2. **Should breadcrumbs from Magnet's event system be auto-captured?** The EventsModule could emit breadcrumbs for content CRUD, auth events, etc. This is straightforward but increases Sentry event payload size. Recommend as a configurable option (`enableMagnetBreadcrumbs: true`).

## Deferred Ideas

- **Session replay**: Add `@sentry/browser` session replay integration to capture user sessions in the admin UI. Requires significant frontend bundle size increase.
- **Source map upload**: Build plugin for Vite/tsup that auto-uploads source maps during build. Separate tooling concern.
- **Release tracking**: Integrate with CI/CD to tag Sentry releases with git commit info.
- **Sentry tunnel endpoint**: Proxy client events through backend to bypass ad blockers.
- **Alert rules configuration**: Admin UI page to configure Sentry alert rules via API.
