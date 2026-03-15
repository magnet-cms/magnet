# Auth Settings Adapter Awareness Implementation Plan

Created: 2026-03-15
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** When using third-party auth adapters (Supabase, Clerk), hide all irrelevant built-in auth settings sections, show an informational banner, and surface the external provider's configured OAuth providers and relevant settings in a read-only view.

**Architecture:** Add a `getAuthInfo()` method to the `AuthStrategy` abstract class. Each adapter implements it to query their provider's API for configured OAuth providers and settings. The backend exposes this via the existing `/auth/status` endpoint. The admin frontend reads this info to conditionally render the auth settings tab — either showing the normal form (for built-in JWT) or a read-only info panel with banner and detected providers (for external adapters).

**Tech Stack:** NestJS (backend), React (admin UI), Supabase GoTrue API, Clerk Backend SDK

## Scope

### In Scope

- Add `getAuthInfo()` to `AuthStrategy` abstract class
- Implement `getAuthInfo()` in Supabase adapter (via `GET /auth/v1/settings`)
- Implement `getAuthInfo()` in Clerk adapter (via `@clerk/backend` SDK)
- Extend `/auth/status` response with `authStrategy` and `externalAuthInfo`
- Admin UI: conditionally render auth settings tab based on active strategy
- Admin UI: info banner component for external auth
- Admin UI: read-only display of detected external providers
- i18n messages for banner and provider display

### Out of Scope

- Managing external providers from within Magnet (read-only display only)
- Redirecting users to external dashboards (user clarified: just show a message)
- Modifying how OAuth login buttons work on the login page (separate concern)
- Support for auth adapters beyond Supabase and Clerk

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - Auth strategy pattern: `packages/adapters/auth-supabase/src/supabase-auth.strategy.ts` — extends `AuthStrategy` abstract class
  - Auth status endpoint: `packages/core/src/modules/auth/auth.controller.ts:154` — `GET /auth/status` public endpoint
  - Settings page: `packages/client/admin/src/features/settings/components/SettingsPage.tsx` — tab-based settings with `DynamicSettingsForm`
  - Section card: `packages/client/admin/src/features/settings/components/SettingsSectionCard.tsx` — renders a settings section

- **Conventions:**
  - Backend: NestJS DI, `@Inject()` for tokens, `AUTH_STRATEGY` and `AUTH_CONFIG` injection tokens in `auth.constants.ts`
  - Frontend: React hooks, `useAdapter()` for API calls, `useAppIntl()` for i18n, Tailwind CSS for styling
  - Types: shared via `@magnet-cms/common`, frontend adapter types in `packages/client/admin/src/core/adapters/types.ts`

- **Key files:**
  - `packages/common/src/types/auth.types.ts` — `AuthStrategy` abstract class, `AuthConfig` interface
  - `packages/core/src/modules/auth/auth.service.ts` — `AuthService`, has `@Inject(AUTH_STRATEGY)`
  - `packages/core/src/modules/auth/auth.controller.ts` — auth REST endpoints
  - `packages/core/src/modules/auth/auth.constants.ts` — injection tokens `AUTH_STRATEGY`, `AUTH_CONFIG`
  - `packages/client/admin/src/core/adapters/types.ts` — `AuthStatus` interface, `MagnetApiAdapter`
  - `packages/client/admin/src/features/settings/components/DynamicSettingsForm.tsx` — renders settings sections from schema

- **Gotchas:**
  - The `AuthStrategy` class is in `@magnet-cms/common` — changes there require rebuilding common before core/adapters
  - Supabase GoTrue `GET /auth/v1/settings` is public (only needs anon key), but the URL varies: `{supabaseUrl}/auth/v1/settings`
  - Clerk needs `secretKey` for backend API calls — gracefully handle missing key
  - The `DynamicSettingsForm` renders ALL sections from schema metadata — hiding must happen before form render, not inside
  - `AuthStatus` type is used by both the HTTP adapter and the frontend hooks

- **Domain context:**
  - When `auth.strategy` is `'jwt'` (default), Magnet handles everything: login, registration, password policies, OAuth, sessions
  - When `auth.strategy` is `'supabase'` or `'clerk'`, the external provider handles auth. Magnet only validates tokens. All built-in auth settings (session, password, security, registration, OAuth) are irrelevant
  - External providers have their own OAuth provider configuration. We need to detect which are enabled so Magnet can render correct login buttons

## Runtime Environment

- **Start command:** `bun run dev` (all packages) or `cd apps/examples/drizzle-supabase && bun run dev`
- **Port:** 3000 (API), 5173 (admin UI dev)
- **Health check:** `GET /health`

## Assumptions

- Supabase GoTrue `GET /auth/v1/settings` returns enabled providers as `{ external: { google: true, github: false, ... } }` — supported by Context7 docs — Tasks 2, 3 depend on this
- Clerk Backend API `GET https://api.clerk.com/v1/instance` returns instance config including social login providers — requires `secretKey` for `Authorization: Bearer` header — Tasks 3, 4 depend on this
- The `auth.strategy` field in `MagnetModuleOptions` is always set for external adapters (never undefined/missing) — supported by `apps/examples/drizzle-supabase/src/app.module.ts:59` — Tasks 1, 5 depend on this
- `AuthService` has access to the `AUTH_STRATEGY` injection token — supported by `auth.service.ts:18` — Task 5 depends on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Supabase GoTrue settings endpoint not available in all versions | Low | Medium | Wrap in try/catch, return empty providers array on failure |
| Clerk API rate limiting on provider query | Low | Low | Cache result for 5 minutes, only fetch on settings page load |
| External adapter getAuthInfo() fails (network, auth) | Medium | Low | Graceful degradation: show banner with "unable to detect providers" message |

## Goal Verification

### Truths

1. When running drizzle-supabase example, the Authentication settings tab shows an info banner instead of editable form fields
2. The banner displays the active auth strategy name ("Supabase")
3. Configured OAuth providers from Supabase are listed in the read-only view
4. When running mongoose example (built-in JWT), all auth settings sections remain visible and editable as before
5. The `/auth/status` endpoint returns `authStrategy` field indicating the active strategy
6. The `/auth/status` endpoint returns `externalAuthInfo` with provider list when using external adapters

### Artifacts

1. `packages/common/src/types/auth.types.ts` — `getAuthInfo()` method on `AuthStrategy`
2. `packages/adapters/auth-supabase/src/supabase-auth.strategy.ts` — Supabase `getAuthInfo()` implementation
3. `packages/adapters/auth-clerk/src/clerk-auth.strategy.ts` — Clerk `getAuthInfo()` implementation
4. `packages/core/src/modules/auth/auth.controller.ts` — extended `/auth/status` response
5. `packages/client/admin/src/features/settings/components/ExternalAuthBanner.tsx` — banner component
6. `packages/client/admin/src/features/settings/components/SettingsPage.tsx` — conditional rendering

## Progress Tracking

- [x] Task 1: Add `getAuthInfo()` to AuthStrategy and types
- [x] Task 2: Implement Supabase `getAuthInfo()`
- [x] Task 3: Implement Clerk `getAuthInfo()`
- [x] Task 4: Extend `/auth/status` backend endpoint
- [x] Task 5: Admin UI — ExternalAuthBanner component
- [x] Task 6: Admin UI — Conditional auth settings rendering
- [x] Task 7: E2E tests

**Total Tasks:** 7 | **Completed:** 7 | **Remaining:** 0

## Implementation Tasks

### Task 1: Add `getAuthInfo()` to AuthStrategy and types

**Objective:** Define the `getAuthInfo()` optional method on the `AuthStrategy` abstract class and the `ExternalAuthInfo` type that it returns.

**Dependencies:** None

**Files:**

- Modify: `packages/common/src/types/auth.types.ts`
- Modify: `packages/common/src/types/index.ts` (ensure new type is exported)

**Key Decisions / Notes:**

- Add `ExternalAuthInfo` interface: `{ strategy: string, isExternal: boolean, providers: string[], providerSettings?: Record<string, unknown> }`
- Add optional `getAuthInfo?(): Promise<ExternalAuthInfo>` to `AuthStrategy` abstract class (optional so existing strategies don't break)
- The built-in JWT strategy does NOT need to implement this — `undefined` means built-in

**Definition of Done:**

- [ ] `ExternalAuthInfo` type exists and is exported from `@magnet-cms/common`
- [ ] `AuthStrategy` has optional `getAuthInfo()` method
- [ ] `bun run check-types` passes
- [ ] No breaking changes to existing code

**Verify:**

- `cd packages/common && bunx tsc --noEmit`

---

### Task 2: Implement Supabase `getAuthInfo()`

**Objective:** Implement `getAuthInfo()` in the Supabase auth strategy by calling Supabase's GoTrue `GET /auth/v1/settings` endpoint to detect configured providers.

**Dependencies:** Task 1

**Files:**

- Modify: `packages/adapters/auth-supabase/src/supabase-auth.strategy.ts`

**Key Decisions / Notes:**

- Call `GET {supabaseUrl}/auth/v1/settings` with anon key as `apikey` header
- Parse `response.external` object — filter to providers where value is `true`
- Include `disable_signup` and `autoconfirm` in `providerSettings` for info display
- Wrap in try/catch — return `{ strategy: 'supabase', isExternal: true, providers: [] }` on failure
- Use native `fetch` (available in Bun/Node 18+) to avoid extra dependencies

**Definition of Done:**

- [ ] `getAuthInfo()` returns strategy name, `isExternal: true`, and list of enabled providers
- [ ] Gracefully handles API errors (returns empty providers)
- [ ] `bun run check-types` passes

**Verify:**

- `cd packages/adapters/auth-supabase && bunx tsc --noEmit`

---

### Task 3: Implement Clerk `getAuthInfo()`

**Objective:** Implement `getAuthInfo()` in the Clerk auth strategy using the `@clerk/backend` SDK to detect configured social providers.

**Dependencies:** Task 1

**Files:**

- Modify: `packages/adapters/auth-clerk/src/clerk-auth.strategy.ts`

**Key Decisions / Notes:**

- Use Clerk Backend API directly: `fetch('https://api.clerk.com/v1/instance', { headers: { Authorization: 'Bearer ${secretKey}' } })` — the response includes enabled social login providers
- Do NOT use `allowlistIdentifiers` — that is for email/phone allowlists, not OAuth providers
- If `secretKey` is missing, return `{ strategy: 'clerk', isExternal: true, providers: [] }` with graceful message
- The `@clerk/backend` package is already a dependency of this adapter
- Wrap in try/catch — return empty providers on any API failure

**Definition of Done:**

- [ ] `getAuthInfo()` returns strategy name, `isExternal: true`, and detected providers
- [ ] Gracefully handles missing secretKey or API errors
- [ ] `bun run check-types` passes

**Verify:**

- `cd packages/adapters/auth-clerk && bunx tsc --noEmit`

---

### Task 4: Extend `/auth/status` backend endpoint

**Objective:** Add `authStrategy` and `externalAuthInfo` fields to the `/auth/status` response so the admin frontend knows which strategy is active and what providers are configured externally.

**Dependencies:** Task 1

**Files:**

- Modify: `packages/core/src/modules/auth/auth.controller.ts` — extend `status()` response
- Modify: `packages/core/src/modules/auth/auth.service.ts` — add `getAuthInfo()` method that delegates to strategy

**Key Decisions / Notes:**

- `AuthService` already has `@Inject(AUTH_STRATEGY) private readonly strategy: AuthStrategy`
- Add `getAuthInfo()` method to `AuthService` that calls `this.strategy.getAuthInfo?.()` and returns default for built-in
- Default for built-in JWT: `{ strategy: 'jwt', isExternal: false, providers: [] }`
- In controller `status()`, call `authService.getAuthInfo()` and spread into response
- Cache the result in AuthService (strategy config doesn't change at runtime)

**Definition of Done:**

- [ ] `GET /auth/status` returns `authStrategy: string` field
- [ ] `GET /auth/status` returns `externalAuthInfo` when strategy is external
- [ ] Built-in JWT returns `authStrategy: 'jwt'` with no `externalAuthInfo`
- [ ] `bun run check-types` passes

**Verify:**

- `cd packages/core && bunx tsc --noEmit`

---

### Task 5: Admin UI — ExternalAuthBanner component

**Objective:** Create a banner component that displays when external auth is active, showing the provider name, an info message, and detected OAuth providers.

**Dependencies:** Task 4

**Files:**

- Create: `packages/client/admin/src/features/settings/components/ExternalAuthBanner.tsx`
- Modify: `packages/client/admin/src/features/settings/components/index.ts` (export new component)
- Modify: `packages/client/admin/src/i18n/messages/en.ts` (add i18n messages)

**Key Decisions / Notes:**

- Props: `{ strategyName: string, providers: string[], providerSettings?: Record<string, unknown> }`
- Layout: Card with info icon, title "Authentication managed by {strategyName}", description text, and a grid of provider badges
- Use existing UI primitives from `@magnet-cms/ui` (Card, Badge)
- Style: soft blue/info color scheme to distinguish from editable settings cards
- Provider badges: capitalize provider names, use a simple chip/badge style
- i18n keys: `settings.auth.externalBanner.title`, `settings.auth.externalBanner.description`, `settings.auth.externalBanner.providers`

**Definition of Done:**

- [ ] Component renders banner with strategy name and provider list
- [ ] Uses i18n for all text content
- [ ] Follows existing component patterns (Tailwind, functional component)
- [ ] `bun run check-types` passes

**Verify:**

- `cd packages/client/admin && bunx tsc --noEmit`

---

### Task 6: Admin UI — Conditional auth settings rendering

**Objective:** When the auth tab is active and strategy is external, replace the `DynamicSettingsForm` with the `ExternalAuthBanner` instead of showing editable built-in auth settings.

**Dependencies:** Task 4, Task 5

**Files:**

- Modify: `packages/client/admin/src/core/adapters/types.ts` — extend `AuthStatus` with new fields
- Modify: `packages/client/admin/src/core/adapters/http-adapter.ts` — ensure `getStatus()` passes through `authStrategy` and `externalAuthInfo` fields from API response
- Modify: `packages/client/admin/src/hooks/useAuth.ts` or create new hook — expose auth info
- Modify: `packages/client/admin/src/features/settings/components/SettingsPage.tsx` — conditional rendering for auth tab

**Key Decisions / Notes:**

- Extend `AuthStatus` interface with `authStrategy?: string` and `externalAuthInfo?: { strategy: string, isExternal: boolean, providers: string[], providerSettings?: Record<string, unknown> }`
- **Important:** The existing `AuthStatus.providers` field is for login-page OAuth buttons (built-in OAuth). The new `externalAuthInfo.providers` is for the settings page banner (external adapter's providers). They serve different purposes — do not unify them.
- Verify that `http-adapter.ts` `getStatus()` passes through `authStrategy` and `externalAuthInfo` from the API response (not just the subset of fields it currently maps)
- Verify that `getStatus()` is called (or add a new call) when SettingsPage mounts. If `getStatus()` is only called during auth init, add a separate `useAuthInfo()` hook or query that fetches `/auth/status` on the settings page
- In `SettingsPage`, when `activeTab === 'auth'` and `externalAuthInfo?.isExternal`, render `ExternalAuthBanner` instead of `DynamicSettingsForm`
- The tab itself ("Authentication") still shows in the tab bar — only the content changes
- Save/Reset buttons should be hidden when showing the banner (no editable fields)

**Definition of Done:**

- [ ] Auth settings tab shows `ExternalAuthBanner` when using external adapter
- [ ] Auth settings tab shows normal `DynamicSettingsForm` when using built-in JWT
- [ ] Save/Reset buttons hidden when banner is shown
- [ ] `AuthStatus` type includes new fields
- [ ] `bun run check-types` passes

**Verify:**

- `cd packages/client/admin && bunx tsc --noEmit`

---

### Task 7: E2E tests

**Objective:** Write E2E tests that verify both the API response shape and the UI conditional rendering behavior.

**Dependencies:** Tasks 1-6

**Files:**

- Create: `apps/e2e/tests/api/auth-settings-awareness.spec.ts`
- Create: `apps/e2e/tests/ui/auth-settings-awareness.spec.ts`

**Key Decisions / Notes:**

- **API test:** Verify `/auth/status` returns `authStrategy` field. For the mongoose example (JWT), verify `authStrategy: 'jwt'`
- **UI test:** With the default mongoose example (JWT strategy), verify the auth settings tab renders the normal `DynamicSettingsForm` with editable sections. This proves the conditional rendering logic works for the built-in case. Testing the external case (banner rendering) requires a running Supabase instance — defer to manual verification or a future integration test
- Follow existing E2E patterns in `apps/e2e/tests/`

**Definition of Done:**

- [ ] API test verifies `/auth/status` returns `authStrategy` field
- [ ] UI test verifies auth settings tab renders editable form for JWT strategy
- [ ] Tests pass with `bun run test:e2e --project=api` and `bun run test:e2e --project=ui`
- [ ] No regressions in existing E2E tests

**Verify:**

- `bun run test:e2e --project=api`
- `bun run test:e2e --project=ui`

## Open Questions

None — all clarified during planning.

### Deferred Ideas

- **Dashboard redirect link:** Add configurable link to external provider's dashboard (e.g., Supabase Studio URL) — user clarified this is not needed for now
- **Login page provider buttons:** Use detected external providers to automatically render the correct OAuth buttons on the login page
- **Provider-specific settings display:** Show more detailed read-only settings from external provider (e.g., password policies, MFA status from Supabase)
- **Unify providers fields:** The top-level `AuthStatus.providers` and `externalAuthInfo.providers` serve overlapping purposes (login buttons vs settings display). Consider unifying them in a future refactor
