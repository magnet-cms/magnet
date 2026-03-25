# @magnet-cms/adapter-mongoose

## 4.0.0

### Patch Changes

- Updated dependencies [[`1e54cb4`](https://github.com/magnet-cms/magnet/commit/1e54cb48d65f0ca6a2ccd893357a1aec82722dfa)]:
  - @magnet-cms/common@0.4.0

## 3.0.0

### Patch Changes

- [`5f4dc9e`](https://github.com/magnet-cms/magnet/commit/5f4dc9e042a84ba552be67c8c06024630cf447d5) Thanks [@gjsoaresc](https://github.com/gjsoaresc)! - Add post-signup onboarding wizard, optional auth guard, and UI improvements
  - **Setup wizard**: New post-signup onboarding flow for admin users to configure project settings (site name, base URL, language, timezone)
  - **OptionalDynamicAuthGuard**: New guard that populates `req.user` when a valid token is present without rejecting unauthenticated requests. Applied to `GET /auth/status` so `onboardingCompleted` is returned for authenticated users.
  - **Auth status cache invalidation**: `useLogin` and `useRegister` hooks now invalidate `AUTH_STATUS_KEY` after login/registration to get fresh onboarding state.
  - **Database adapter singleton fallback**: Added `registerDatabaseAdapterSingletonForFeature()` to handle CJS module load order where feature modules are required before `forRoot()` runs.
  - **UI improvements**: Activity page, media drawer, users listing, webhooks management.
  - **i18n**: Added messages for new features (en, es, pt-BR).

- Updated dependencies [[`5f4dc9e`](https://github.com/magnet-cms/magnet/commit/5f4dc9e042a84ba552be67c8c06024630cf447d5)]:
  - @magnet-cms/common@0.3.0

## 2.0.0

### Patch Changes

- Updated dependencies [[`f63ef65`](https://github.com/magnet-cms/magnet/commit/f63ef6520c8395b90e35eb530f0d2e2aee4adf12)]:
  - @magnet-cms/common@0.2.0

## 1.0.2

### Patch Changes

- [`a53ab67`](https://github.com/magnet-cms/magnet/commit/a53ab67185ea17af6f219b66d3c128a8ffd185f7) Thanks [@gjsoaresc](https://github.com/gjsoaresc)! - Fix workspace:\* protocol in peerDependencies and dependencies - npm does not support workspace: protocol

## 1.0.1

### Patch Changes

- [`a124238`](https://github.com/magnet-cms/magnet/commit/a12423819ebaa77c5998efe76921c531e5d4e5b6) Thanks [@gjsoaresc](https://github.com/gjsoaresc)! - Recent updates and bug fixes across all packages:

  **@magnet-cms/core:**
  - Add extensible authentication strategy system
  - Add media storage module with upload, transforms, and admin UI
  - Add runtime plugin loading system
  - Add health module
  - Enhance settings module
  - Filter invalid environment items and add extensible auth user check
  - Skip validation for drafts, validate on publish

  **@magnet-cms/adapter-mongoose:**
  - Add query builder for advanced database queries

  **@magnet-cms/admin:**
  - Enhance content manager with versioning, media uploads, and UI improvements
  - Add dialog service and improve playground layout
  - Add reusable PageHeader component and sidebar styling
  - Add environment management and type safety improvements
  - Add new form field types and multi-select component
  - Reduce form field spacing and standardize date field gaps
  - Fix form field alignment when some have hints and others don't
  - Filter relationship selectors to show only published items

  **@magnet-cms/plugin-content-builder:**
  - Add rich text editor and relation config modal
  - Add backend module generation and UI improvements

  **@magnet-cms/common:**
  - Type updates and improvements

  **@magnet-cms/ui:**
  - Component library updates

  **@magnet-cms/utils:**
  - Utility function improvements

  **@magnet-cms/plugin-seo:**
  - Initial setup improvements

- Updated dependencies [[`a124238`](https://github.com/magnet-cms/magnet/commit/a12423819ebaa77c5998efe76921c531e5d4e5b6)]:
  - @magnet-cms/common@0.1.1

## 1.0.0

### Minor Changes

- Initial public release of Magnet CMS packages
  - @magnet-cms/common: Shared types, decorators, and utilities
  - @magnet-cms/utils: Utility functions
  - @magnet-cms/core: Core NestJS module with Admin, Auth, Content, Database modules
  - @magnet-cms/ui: UI component library built with Radix UI and Tailwind
  - @magnet-cms/admin: React admin dashboard
  - @magnet-cms/adapter-mongoose: Mongoose database adapter
  - @magnet-cms/plugin-content-builder: Visual schema builder and code generator
  - @magnet-cms/plugin-seo: SEO plugin

### Patch Changes

- Updated dependencies []:
  - @magnet-cms/common@0.1.0
