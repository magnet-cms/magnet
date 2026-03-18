---
"@magnet-cms/core": patch
"@magnet-cms/adapter-auth-supabase": patch
"@magnet-cms/adapter-auth-clerk": patch
---

fix: resolve self-referencing imports that broke DTS generation in CI

- Changed 13 `from '@magnet-cms/core'` imports within core to `from '~/modules/database'`
- Added external config for auth adapters to prevent bundling NestJS internals
- Fixed example app tsconfig and import paths for subpath exports
