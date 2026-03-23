# @magnet-cms/plugin-polar

## 3.0.0

### Patch Changes

- Updated dependencies [[`b6b5350`](https://github.com/magnet-cms/magnet/commit/b6b53501fd647a21bf86eb1283355ec9907a56f3)]:
  - @magnet-cms/core@3.1.0
  - @magnet-cms/admin@0.4.0

## 2.0.0

### Patch Changes

- Updated dependencies [[`5f4dc9e`](https://github.com/magnet-cms/magnet/commit/5f4dc9e042a84ba552be67c8c06024630cf447d5)]:
  - @magnet-cms/core@3.0.0
  - @magnet-cms/admin@0.3.0
  - @magnet-cms/common@0.3.0
  - @magnet-cms/utils@0.1.1

## 1.0.0

### Patch Changes

- [`f63ef65`](https://github.com/magnet-cms/magnet/commit/f63ef6520c8395b90e35eb530f0d2e2aee4adf12) Thanks [@gjsoaresc](https://github.com/gjsoaresc)! - Add cache module with in-memory and Redis adapters, migrate admin and plugins to semantic theme tokens

  - **core**: Add `CacheModule` with `@Cacheable`, `@CachePut`, `@CacheEvict`, `@CacheTtl` decorators, `CacheInterceptor`, `MemoryCacheAdapter` (LRU eviction), and `CacheSettings` for runtime configuration
  - **adapter-cache-redis**: New package — Redis/Dragonfly cache adapter using ioredis with SCAN-based pattern deletion
  - **common**: Add `CacheAdapter` interface, `CacheEntry`, `CacheOptions`, and related types
  - **admin**: Migrate all admin UI components to semantic theme tokens (light/dark mode), fix `useSettingData` typing for array responses, add `nav.plugins` i18n key
  - **ui**: Minor component fixes (slider, collection-card, filter-pills, timeline-item, data-table)
  - **plugin-polar**, **plugin-sentry**, **plugin-stripe**: Migrate admin pages to semantic theme token utilities

- Updated dependencies [[`f63ef65`](https://github.com/magnet-cms/magnet/commit/f63ef6520c8395b90e35eb530f0d2e2aee4adf12)]:
  - @magnet-cms/common@0.2.0
  - @magnet-cms/core@2.0.0
  - @magnet-cms/admin@0.2.0
  - @magnet-cms/ui@0.1.3
  - @magnet-cms/utils@0.1.1
