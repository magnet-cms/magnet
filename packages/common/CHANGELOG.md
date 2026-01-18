# @magnet-cms/common

## 0.1.1

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

## 0.1.0

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
