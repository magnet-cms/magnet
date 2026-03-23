# @magnet-cms/admin

## 0.4.0

### Minor Changes

- [`b6b5350`](https://github.com/magnet-cms/magnet/commit/b6b53501fd647a21bf86eb1283355ec9907a56f3) Thanks [@gjsoaresc](https://github.com/gjsoaresc)! - Add email template management system with Lexical editor and locale support.

  - New `EmailTemplateModule` with CRUD endpoints and version history
  - `GET /email-templates/by-slug/:slug` for locale-aware template retrieval
  - Admin UI with Lexical-based rich text editor and live iframe preview
  - Locale variant switching via ContentHeader locale switcher
  - Variable badge nodes in the editor for template syntax highlighting
  - DataTable-based listing page

## 0.3.0

### Minor Changes

- [`5f4dc9e`](https://github.com/magnet-cms/magnet/commit/5f4dc9e042a84ba552be67c8c06024630cf447d5) Thanks [@gjsoaresc](https://github.com/gjsoaresc)! - Add post-signup onboarding wizard, optional auth guard, and UI improvements

  - **Setup wizard**: New post-signup onboarding flow for admin users to configure project settings (site name, base URL, language, timezone)
  - **OptionalDynamicAuthGuard**: New guard that populates `req.user` when a valid token is present without rejecting unauthenticated requests. Applied to `GET /auth/status` so `onboardingCompleted` is returned for authenticated users.
  - **Auth status cache invalidation**: `useLogin` and `useRegister` hooks now invalidate `AUTH_STATUS_KEY` after login/registration to get fresh onboarding state.
  - **Database adapter singleton fallback**: Added `registerDatabaseAdapterSingletonForFeature()` to handle CJS module load order where feature modules are required before `forRoot()` runs.
  - **UI improvements**: Activity page, media drawer, users listing, webhooks management.
  - **i18n**: Added messages for new features (en, es, pt-BR).

### Patch Changes

- Updated dependencies []:
  - @magnet-cms/utils@0.1.1

## 0.2.0

### Minor Changes

- [`f63ef65`](https://github.com/magnet-cms/magnet/commit/f63ef6520c8395b90e35eb530f0d2e2aee4adf12) Thanks [@gjsoaresc](https://github.com/gjsoaresc)! - Add cache module with in-memory and Redis adapters, migrate admin and plugins to semantic theme tokens

  - **core**: Add `CacheModule` with `@Cacheable`, `@CachePut`, `@CacheEvict`, `@CacheTtl` decorators, `CacheInterceptor`, `MemoryCacheAdapter` (LRU eviction), and `CacheSettings` for runtime configuration
  - **adapter-cache-redis**: New package — Redis/Dragonfly cache adapter using ioredis with SCAN-based pattern deletion
  - **common**: Add `CacheAdapter` interface, `CacheEntry`, `CacheOptions`, and related types
  - **admin**: Migrate all admin UI components to semantic theme tokens (light/dark mode), fix `useSettingData` typing for array responses, add `nav.plugins` i18n key
  - **ui**: Minor component fixes (slider, collection-card, filter-pills, timeline-item, data-table)
  - **plugin-polar**, **plugin-sentry**, **plugin-stripe**: Migrate admin pages to semantic theme token utilities

### Patch Changes

- Updated dependencies [[`f63ef65`](https://github.com/magnet-cms/magnet/commit/f63ef6520c8395b90e35eb530f0d2e2aee4adf12)]:
  - @magnet-cms/ui@0.1.3
  - @magnet-cms/utils@0.1.1
