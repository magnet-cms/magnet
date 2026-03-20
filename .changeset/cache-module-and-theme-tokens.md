---
"@magnet-cms/adapter-cache-redis": minor
"@magnet-cms/common": minor
"@magnet-cms/core": minor
"@magnet-cms/admin": minor
"@magnet-cms/ui": patch
"@magnet-cms/plugin-polar": patch
"@magnet-cms/plugin-sentry": patch
"@magnet-cms/plugin-stripe": patch
---

Add cache module with in-memory and Redis adapters, migrate admin and plugins to semantic theme tokens

- **core**: Add `CacheModule` with `@Cacheable`, `@CachePut`, `@CacheEvict`, `@CacheTtl` decorators, `CacheInterceptor`, `MemoryCacheAdapter` (LRU eviction), and `CacheSettings` for runtime configuration
- **adapter-cache-redis**: New package — Redis/Dragonfly cache adapter using ioredis with SCAN-based pattern deletion
- **common**: Add `CacheAdapter` interface, `CacheEntry`, `CacheOptions`, and related types
- **admin**: Migrate all admin UI components to semantic theme tokens (light/dark mode), fix `useSettingData` typing for array responses, add `nav.plugins` i18n key
- **ui**: Minor component fixes (slider, collection-card, filter-pills, timeline-item, data-table)
- **plugin-polar**, **plugin-sentry**, **plugin-stripe**: Migrate admin pages to semantic theme token utilities
