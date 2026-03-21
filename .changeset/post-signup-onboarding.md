---
"@magnet-cms/core": minor
"@magnet-cms/admin": minor
"@magnet-cms/common": minor
"@magnet-cms/adapter-db-drizzle": patch
"@magnet-cms/adapter-db-mongoose": patch
---

Add post-signup onboarding wizard, optional auth guard, and UI improvements

- **Setup wizard**: New post-signup onboarding flow for admin users to configure project settings (site name, base URL, language, timezone)
- **OptionalDynamicAuthGuard**: New guard that populates `req.user` when a valid token is present without rejecting unauthenticated requests. Applied to `GET /auth/status` so `onboardingCompleted` is returned for authenticated users.
- **Auth status cache invalidation**: `useLogin` and `useRegister` hooks now invalidate `AUTH_STATUS_KEY` after login/registration to get fresh onboarding state.
- **Database adapter singleton fallback**: Added `registerDatabaseAdapterSingletonForFeature()` to handle CJS module load order where feature modules are required before `forRoot()` runs.
- **UI improvements**: Activity page, media drawer, users listing, webhooks management.
- **i18n**: Added messages for new features (en, es, pt-BR).
