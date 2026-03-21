# Post-Signup Onboarding Setup Flow

Created: 2026-03-20
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Replace the irrelevant "Identity & Basics" profile setup page with a project onboarding flow that collects essential project settings (Site Name, Base URL, Default Locale, Timezone) after signup.

**Architecture:** Backend extends `GET /auth/status` with `onboardingCompleted` derived from whether general settings differ from defaults. Frontend creates a new setup form at `/setup` using the existing settings mutation API, deletes the profile-setup feature, and updates routing to redirect to onboarding when needed.

**Tech Stack:** NestJS backend (SettingsService injection), React frontend (react-hook-form, existing `useSettingMutation` hook, AuthLayout reuse)

## Scope

### In Scope

- Backend: Add `onboardingCompleted` field to `GET /auth/status` authenticated response
- Frontend: New onboarding setup page at `/setup` with Site Name, Base URL, Default Locale, Timezone
- Frontend: "Skip for now" link (persists per session via sessionStorage; shows again next session)
- Frontend: Delete entire `profile-setup` feature folder and route
- Frontend: Update PrivateRoute to redirect admin users to `/setup` when onboarding incomplete
- Frontend: Update SignupPage redirect from `/profile-setup` to `/setup`

### Out of Scope

- Multi-step wizard (single page is sufficient for 4 fields)
- Onboarding for non-admin users
- Per-user onboarding state tracking
- ConfigurationForm cleanup (dead code — separate task)

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - Auth status endpoint: `packages/core/src/modules/auth/auth.controller.ts:154-189` — existing `status()` method
  - Settings mutation hook: `packages/client/admin/src/hooks/useSetting.ts:22-42` — `useSettingMutation('general')`
  - Settings data hook: `packages/client/admin/src/hooks/useSetting.ts:9-17` — `useSettingData('general')`
  - Auth form style: `packages/client/admin/src/features/auth/register/components/SignupForm.tsx` — form structure pattern
  - AuthLayout: `packages/client/admin/src/features/auth/shared/components/AuthLayout.tsx` — split-screen wrapper
  - Route definitions: `packages/client/admin/src/routes/index.tsx:369-439`

- **Conventions:**
  - Feature folders: `features/auth/<feature>/components/` with barrel exports
  - Intl: all user-facing strings use `intl.formatMessage({ id: '...', defaultMessage: '...' })`
  - Form components: Use `@magnet-cms/ui` components (Input, Select, Button) and react-hook-form with zod resolver
  - Page wrappers in routes: Define lightweight wrapper functions in `routes/index.tsx` (see `SignupPage`, `LoginPage` pattern)

- **Key files:**
  - `packages/core/src/modules/settings/settings.service.ts` — SettingsService with `getSettingsByGroup()` and `getDefaultsByGroup()`
  - `packages/core/src/modules/general/general.settings.ts` — GeneralSettings schema with `siteName` (default: 'Magnet CMS'), `baseUrl` (default: 'http://localhost:3000'), locale/timezone fields
  - `packages/client/admin/src/core/adapters/types.ts:105-120` — AuthStatus interface
  - `packages/client/admin/src/hooks/useAuth.ts:60-67` — useRegister hook
  - `packages/client/admin/src/routes/PrivateRoute.tsx` — route guard with status check

- **Gotchas:**
  - `SettingsModule.forRoot()` is global — SettingsService is injectable anywhere without additional imports
  - Settings records are created on app boot with defaults via `registerSettingsFromSchema`. Cannot check "records exist" — must check actual values.
  - `onboardingCompleted` check: `siteName !== 'Magnet CMS' || baseUrl !== 'http://localhost:3000'` — if either differs from default, onboarding was completed
  - Locale and timezone arrays must be hardcoded in the frontend (`general.settings.ts` is in `@magnet-cms/core` and not importable by the admin UI package). Keep them in sync manually.
  - AuthLayout footer shows "Don't have an account? Sign up" by default — override for onboarding page
  - The `useSettingData('general')` hook returns flat key-value settings (not the array form shown in ConfigurationForm)
  - `useAuth()` returns `{ user, isAuthenticated, hasRole, ... }` where `user.role` is a string (e.g., `'admin'`). See `useAuth.ts:270-279`.
  - **Redirect loop risk**: `/setup` is behind PrivateRoute, which checks `onboardingCompleted`. Must add `location.pathname !== '/setup'` guard to prevent infinite redirect.

- **Domain context:**
  - First user always gets admin role (handled by existing first-user setup fix)
  - `requiresSetup` in auth status is for the no-users state; `onboardingCompleted` is for post-signup settings
  - The admin UI always has PrivateRoute as the outermost guard for dashboard routes

## Runtime Environment

- **Start command:** `bun run dev` (all apps) or `bun run dev:admin` (admin UI only)
- **Port:** Backend 3000, Admin UI 5173 (Vite dev server)
- **Health check:** `GET /auth/status`

## Assumptions

- SettingsService is globally injectable (SettingsModule.forRoot is global: true) — supported by `settings.module.ts:57-58` — Task 1 depends on this
- General settings are always initialized on boot with defaults — supported by `SettingsInitializer.onApplicationBootstrap()` — Task 1 depends on this
- `useSettingMutation('general')` works for saving flat key-value pairs — supported by `useSetting.ts:22-42` and `settings.controller.ts:63-94` — Task 2 depends on this
- Admin users have `role: 'admin'` in the authenticated user object — supported by first-user-admin-setup plan — Task 3 depends on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| General settings not yet initialized when auth/status is called on first boot | Low | Medium | Catch errors in SettingsService.getSettingsByGroup and default to `onboardingCompleted: false` |
| Skip flag lost if user opens new tab | Low | Low | sessionStorage is per-tab. User sees onboarding again in new tab — acceptable since it's skippable |
| User names project "Magnet CMS" with default Base URL | Very Low | Low | Edge case — onboarding would reappear. User can change base URL to mark as complete |
| Infinite redirect loop on `/setup` page | Medium | High | Add `location.pathname !== '/setup'` guard in PrivateRoute onboarding redirect check |

## Goal Verification

### Truths

1. After signup, the admin user sees a setup form with Site Name, Base URL, Default Locale, and Timezone — not "Identity & Basics"
2. Completing the setup form saves values to the general settings group and navigates to the dashboard
3. Skipping the setup navigates to the dashboard; next login shows the setup again
4. After completing onboarding (changing site name or base URL), the setup page never appears again
5. The `/profile-setup` route no longer exists; visiting it shows 404
6. Non-admin users who log in are never redirected to the setup page
7. `GET /auth/status` includes `onboardingCompleted` field for authenticated users

### Artifacts

1. `packages/core/src/modules/auth/auth.controller.ts` — `onboardingCompleted` in status response
2. `packages/client/admin/src/features/auth/setup/components/SetupForm.tsx` — onboarding form
3. `packages/client/admin/src/routes/index.tsx` — updated routing with `/setup`
4. `packages/client/admin/src/routes/PrivateRoute.tsx` — onboarding redirect logic
5. `packages/client/admin/src/core/adapters/types.ts` — updated AuthStatus type

## Progress Tracking

- [x] Task 1: Backend — Add `onboardingCompleted` to auth status
- [x] Task 2: Frontend — Create onboarding setup form
- [x] Task 3: Frontend — Update routing and delete profile-setup

**Total Tasks:** 3 | **Completed:** 3 | **Remaining:** 0

## Implementation Tasks

### Task 1: Backend — Add `onboardingCompleted` to auth status

**Objective:** Extend `GET /auth/status` to return `onboardingCompleted: boolean` in the authenticated response, derived from whether general settings differ from their defaults.

**Dependencies:** None

**Files:**

- Modify: `packages/core/src/modules/auth/auth.controller.ts`

**Key Decisions / Notes:**

- Inject `SettingsService` into `AuthController` constructor (already globally available via `SettingsModule.forRoot()`)
- In the authenticated branch (line 174-175), fetch general settings and compare:
  - `onboardingCompleted = siteName !== 'Magnet CMS' || baseUrl !== 'http://localhost:3000'`
- Use `getSettingsByGroup('general')` which returns `Setting[]`. Find `siteName` and `baseUrl` keys.
- Wrap in try/catch — if settings unavailable, default to `onboardingCompleted: false`
- Also add `onboardingCompleted` to the return type signature

**Definition of Done:**

- [ ] `GET /auth/status` returns `onboardingCompleted: true` when general settings have been modified
- [ ] `GET /auth/status` returns `onboardingCompleted: false` on fresh install with defaults
- [ ] No errors when settings are unavailable (graceful fallback)
- [ ] `bun run check-types` passes

**Verify:**

- `bun run check-types`

---

### Task 2: Frontend — Create onboarding setup form

**Objective:** Create a new setup page at `/setup` with a form collecting Site Name, Base URL, Default Locale, and Timezone, using the existing settings API.

**Dependencies:** None (can be built in parallel with Task 1)

**Files:**

- Create: `packages/client/admin/src/features/auth/setup/components/SetupForm.tsx`
- Create: `packages/client/admin/src/features/auth/setup/components/index.ts`
- Create: `packages/client/admin/src/features/auth/setup/index.ts`
- Modify: `packages/client/admin/src/i18n/messages/en.json`
- Modify: `packages/client/admin/src/i18n/messages/es.json`
- Modify: `packages/client/admin/src/i18n/messages/pt-BR.json`

**Key Decisions / Notes:**

- Form uses `react-hook-form` with zod validation (follow `SignupForm.tsx` pattern)
- Fields:
  - **Site Name**: Text input, required, min 1 char (default: 'Magnet CMS')
  - **Base URL**: Text input with `https://` prefix, optional (default: 'http://localhost:3000')
  - **Default Locale**: Select dropdown using locale options from `general.settings.ts` (default: 'en')
  - **Timezone**: Select dropdown using timezone options from `general.settings.ts` (default: 'utc')
- `onSubmit` callback receives form values — page wrapper will handle mutation
- `onSkip` callback for "Skip for now" link
- Use `intl.formatMessage` for all strings with `auth.setup.*` message IDs
- Title: "Welcome to Magnet" or "Set up your project"
- Subtitle: explain what these settings do
- Layout: vertical stack like SignupForm (not grid — keep it simple)
- Use `@magnet-cms/ui` components: Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button
- The locale and timezone option arrays must be hardcoded inline in the component (same values as backend `general.settings.ts`). Cannot import from `@magnet-cms/core` — it's a backend package.
- Add `auth.setup.*` i18n message keys to all three locale files: `en.json`, `es.json`, `pt-BR.json`

**Definition of Done:**

- [ ] SetupForm renders with 4 fields and Submit/Skip actions
- [ ] Form validates (site name required)
- [ ] `onSubmit` called with form values on submit
- [ ] `onSkip` called when "Skip for now" is clicked
- [ ] `auth.setup.*` keys added to `en.json`, `es.json`, `pt-BR.json`
- [ ] `bun run check-types` passes

**Verify:**

- `bun run check-types`

---

### Task 3: Frontend — Update routing and delete profile-setup

**Objective:** Wire up the new setup page, update the auth flow routing, update types, and remove the old profile-setup feature.

**Dependencies:** Task 1, Task 2

**Files:**

- Delete: `packages/client/admin/src/features/auth/profile-setup/` (entire folder)
- Modify: `packages/client/admin/src/core/adapters/types.ts`
- Modify: `packages/client/admin/src/routes/index.tsx`
- Modify: `packages/client/admin/src/routes/PrivateRoute.tsx`
- Modify: `packages/client/admin/src/i18n/messages/en.json` (remove `auth.profileSetup.*` and `auth.profilePreview.*` keys)
- Modify: `packages/client/admin/src/i18n/messages/es.json` (same cleanup)
- Modify: `packages/client/admin/src/i18n/messages/pt-BR.json` (same cleanup)

**Key Decisions / Notes:**

1. **AuthStatus type** (`types.ts:105`): Add `onboardingCompleted?: boolean` field

2. **PrivateRoute** (`PrivateRoute.tsx`):
   - Import `useLocation` from `react-router-dom`
   - Destructure `{ user }` from the existing `useAuth()` call (currently only destructures `isAuthenticated, isLoading`)
   - After confirming authenticated, check: `if (!status?.onboardingCompleted && user?.role === 'admin' && !sessionStorage.getItem('magnet_onboarding_skipped') && location.pathname !== '/setup')` → redirect to `/setup`
   - The `location.pathname !== '/setup'` guard prevents infinite redirect loop since `/setup` is behind PrivateRoute
   - `useStatus()` is already imported and called; its response now includes `onboardingCompleted` for authenticated users

3. **Routes** (`routes/index.tsx`):
   - Remove `ProfileSetupForm` import and `ProfileSetupPage` wrapper
   - Remove `ProfileSetupFormValues` interface
   - Import `SetupForm` from `~/features/auth/setup`
   - Create `SetupPage` wrapper:
     - Uses `useSettingData('general')` to load current values as defaults
     - Uses `useSettingMutation('general')` to save
     - `handleSubmit`: saves settings, toasts success, navigates to `/`
     - `handleSkip`: sets `sessionStorage.setItem('magnet_onboarding_skipped', 'true')`, navigates to `/`
   - Replace `/profile-setup` route with `/setup` route (still behind PrivateRoute + AuthLayoutWrapper)
   - Update `SignupPage.handleSubmit.onSuccess`: change `navigate('/profile-setup')` to `navigate('/setup')`

4. **Delete profile-setup**: Remove entire `features/auth/profile-setup/` directory (4 files: SetupForm, PreviewCard, 2 index files)

5. **i18n cleanup**: Remove all `auth.profileSetup.*` keys from `en.json`, `es.json`, `pt-BR.json` (13 keys per file) and all `auth.profilePreview.*` keys (6 keys per file)

**Definition of Done:**

- [ ] `/profile-setup` route removed, `/setup` route added
- [ ] Signup redirects to `/setup`
- [ ] Authenticated admin users with default settings are redirected to `/setup`
- [ ] `/setup` route does not cause infinite redirect loop (PrivateRoute has pathname guard)
- [ ] Skip sets sessionStorage flag and navigates to dashboard
- [ ] After saving settings, user navigates to dashboard and is not redirected back
- [ ] Profile-setup feature folder completely deleted
- [ ] All `auth.profileSetup.*` and `auth.profilePreview.*` i18n keys removed from all locale files
- [ ] `bun run check-types` passes
- [ ] No dead imports or references to ProfileSetupForm

**Verify:**

- `bun run check-types`

## Open Questions

None — all decisions resolved.

### Deferred Ideas

- Multi-step onboarding wizard (if more settings need collection in the future)
- Per-user onboarding for non-admin roles
- Clean up dead `ConfigurationForm` component (not used anywhere in app)
