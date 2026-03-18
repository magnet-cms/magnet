# @magnet-cms/adapter-auth-supabase

## 1.0.3

### Patch Changes

- [`86b034c`](https://github.com/magnet-cms/magnet/commit/86b034cf8d7e01563a8775959066a067f08b5db3) Thanks [@gjsoaresc](https://github.com/gjsoaresc)! - fix: resolve self-referencing imports that broke DTS generation in CI

  - Changed 13 `from '@magnet-cms/core'` imports within core to `from '~/modules/database'`
  - Added external config for auth adapters to prevent bundling NestJS internals
  - Fixed example app tsconfig and import paths for subpath exports
