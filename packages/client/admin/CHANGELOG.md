# @magnet-cms/admin

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
