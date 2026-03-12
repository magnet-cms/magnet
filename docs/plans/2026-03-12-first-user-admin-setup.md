# First User Admin Setup Fix Plan

Created: 2026-03-12
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Bugfix

## Summary
**Symptom:** On fresh install, admin UI shows login form instead of signup. First user created gets `authenticated` role (no permissions) instead of `admin`. All subsequent permission-guarded API calls fail with PermissionDeniedError.
**Trigger:** Fresh database, first visit to admin panel.
**Root Cause:** Two gaps — (1) `AuthService.register()` at `packages/core/src/modules/auth/auth.service.ts:101` doesn't auto-assign `admin` role to the first user; (2) `PrivateRoute` at `packages/client/admin/src/routes/PrivateRoute.tsx` doesn't check `requiresSetup` from `GET /auth/status` to redirect to signup on fresh install.

## Investigation
- `GET /auth/status` correctly returns `{ requiresSetup: true }` when no users exist — backend detection works
- `useStatus` hook exists but is never called during the auth routing flow
- `PrivateRoute` redirects to `/auth` → `/login` unconditionally — no setup detection
- `SignupPage` hardcodes `role: 'authenticated'` (routes/index.tsx:105)
- `JwtAuthStrategy.register()` uses `data.role || 'viewer'` — passes through whatever frontend sends
- `authenticated` system role has `permissions: []` — correct by design, but wrong for first user
- `admin` system role has `WILDCARD_PERMISSION` — correct target for first user
- The "list" error (`PermissionDeniedError` code 3000) comes from `PermissionGuard` checking `roles.find` permission

## Fix Approach
**Files:** `packages/core/src/modules/auth/auth.service.ts`, `packages/client/admin/src/routes/PrivateRoute.tsx`
**Strategy:**
1. **Backend (source fix):** In `AuthService.register()`, check if any users exist before creating. If no users → override role to `admin`. This ensures the first user always gets admin, regardless of what role the frontend requests.
2. **Frontend (UX fix):** In `PrivateRoute`, use `useStatus` to check `requiresSetup`. When true, redirect to `/signup` instead of `/login`.
**Tests:** E2E tests for both flows

## Progress
- [x] Task 1: Fix first user admin assignment (backend)
- [x] Task 2: Fix first user detection redirect (frontend)
- [x] Task 3: Verify
**Tasks:** 3 | **Done:** 3

## Tasks
### Task 1: Fix first user admin assignment (backend)
**Objective:** First registered user automatically gets `admin` role
**Files:** `packages/core/src/modules/auth/auth.service.ts`
**TDD:** Write E2E test asserting first registered user has admin role → verify FAILS → add `exists()` check in `register()` to override role to `admin` when no users exist → verify PASS
**Verify:** `bun run test:e2e --project=api`

### Task 2: Fix first user detection redirect (frontend)
**Objective:** Unauthenticated users on fresh install are redirected to `/signup` not `/login`
**Files:** `packages/client/admin/src/routes/PrivateRoute.tsx`
**TDD:** Write E2E test asserting fresh install redirects to signup → verify FAILS → add `useStatus` check in `PrivateRoute`, redirect to `/signup` when `requiresSetup` is true → verify PASS
**Verify:** `bun run test:e2e --project=ui`

### Task 3: Verify
**Objective:** Full suite + quality checks
**Verify:** `bun run test:e2e && bun run check-types && bun run lint`
