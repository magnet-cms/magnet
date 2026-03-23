# @magnet-cms/adapter-auth-supabase

## 5.0.0

### Patch Changes

- Updated dependencies [[`1e54cb4`](https://github.com/magnet-cms/magnet/commit/1e54cb48d65f0ca6a2ccd893357a1aec82722dfa)]:
  - @magnet-cms/common@0.4.0

## 4.0.0

### Major Changes

- [`f248064`](https://github.com/magnet-cms/magnet/commit/f248064db8a0d1a5669546dbdf40b6f7dc57a5b7) Thanks [@gjsoaresc](https://github.com/gjsoaresc)! - BREAKING: Renamed Supabase environment variables to match Supabase's current API key naming.

  - `SUPABASE_ANON_KEY` → `SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_KEY` → `SUPABASE_SECRET_KEY`

  **Migration:** Update your `.env` file to use the new variable names. You can find these values in your Supabase project dashboard at **Settings → API → API Keys**.

## 3.0.0

### Patch Changes

- Updated dependencies [[`5f4dc9e`](https://github.com/magnet-cms/magnet/commit/5f4dc9e042a84ba552be67c8c06024630cf447d5)]:
  - @magnet-cms/common@0.3.0

## 2.0.0

### Patch Changes

- Updated dependencies [[`f63ef65`](https://github.com/magnet-cms/magnet/commit/f63ef6520c8395b90e35eb530f0d2e2aee4adf12)]:
  - @magnet-cms/common@0.2.0

## 1.0.3

### Patch Changes

- [`86b034c`](https://github.com/magnet-cms/magnet/commit/86b034cf8d7e01563a8775959066a067f08b5db3) Thanks [@gjsoaresc](https://github.com/gjsoaresc)! - fix: resolve self-referencing imports that broke DTS generation in CI

  - Changed 13 `from '@magnet-cms/core'` imports within core to `from '~/modules/database'`
  - Added external config for auth adapters to prevent bundling NestJS internals
  - Fixed example app tsconfig and import paths for subpath exports
