import type { CacheAdapter, CacheHealthResult } from '@magnet-cms/common'
import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import type { Type } from '@nestjs/common'

import { CACHE_ADAPTER_TOKEN } from './cache.constants'
import type { CacheSettings } from './cache.settings'

import { SettingsService } from '~/modules/settings/settings.service'

/** Default TTL used when settings are unavailable */
const FALLBACK_DEFAULT_TTL = 300

/**
 * CacheService provides a high-level API over any CacheAdapter.
 *
 * Inject this service wherever caching is needed. When @Cacheable(),
 * @CacheEvict(), or @CachePut() decorators are used on controller methods,
 * the CacheInterceptor uses this service automatically.
 *
 * For service-level caching, inject CacheService directly and call get/set.
 *
 * Settings integration: the `enabled`, `defaultTtl`, and `maxMemoryEntries`
 * fields in the admin Settings UI take effect at runtime — no restart needed.
 *
 * @example
 * ```typescript
 * constructor(private readonly cache: CacheService) {}
 *
 * async getPost(id: string) {
 *   const cached = await this.cache.get<Post>(`posts:${id}`)
 *   if (cached) return cached
 *   const post = await this.postRepo.findById(id)
 *   await this.cache.set(`posts:${id}`, post)
 *   return post
 * }
 * ```
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name)

  constructor(
    @Inject(CACHE_ADAPTER_TOKEN) private readonly adapter: CacheAdapter,
    @Optional() private readonly settingsService?: SettingsService,
  ) {}

  /** Name of the active cache adapter */
  get adapterName(): string {
    return this.adapter.name
  }

  /**
   * Retrieve a cached value by key.
   * Returns null if cache is disabled via Settings or the key is not found.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!(await this.isEnabled())) return null
    return this.adapter.get<T>(key)
  }

  /**
   * Store a value in the cache.
   * No-op if cache is disabled via Settings.
   * @param key - Cache key
   * @param value - Value to cache (must be JSON-serializable)
   * @param ttl - TTL in seconds. If omitted, uses the Settings defaultTtl.
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!(await this.isEnabled())) return
    const resolvedTtl = ttl ?? (await this.getDefaultTtl())
    return this.adapter.set<T>(key, value, resolvedTtl)
  }

  /**
   * Remove a value from the cache.
   */
  async delete(key: string): Promise<void> {
    return this.adapter.delete(key)
  }

  /**
   * Remove all cache entries matching a glob pattern.
   * @param pattern - Glob pattern (e.g., `posts:*`)
   */
  async deleteByPattern(pattern: string): Promise<void> {
    return this.adapter.deleteByPattern(pattern)
  }

  /**
   * Check if a key exists and has not expired.
   */
  async has(key: string): Promise<boolean> {
    return this.adapter.has(key)
  }

  /**
   * Remove all cache entries.
   */
  async clear(): Promise<void> {
    this.logger.log('Clearing all cache entries')
    return this.adapter.clear()
  }

  /**
   * Check cache adapter health.
   */
  async healthCheck(): Promise<CacheHealthResult> {
    return this.adapter.healthCheck()
  }

  private async getSettings(): Promise<CacheSettings | null> {
    if (!this.settingsService) return null
    try {
      // Lazy import avoids triggering @SettingField decorators in test environments
      const { CacheSettings } = await import('./cache.settings')
      return await (
        this.settingsService as unknown as {
          get<T extends object>(cls: Type<T>): Promise<T>
        }
      ).get(CacheSettings)
    } catch {
      return null
    }
  }

  private async isEnabled(): Promise<boolean> {
    const settings = await this.getSettings()
    return settings?.enabled ?? true
  }

  private async getDefaultTtl(): Promise<number> {
    const settings = await this.getSettings()
    return settings?.defaultTtl ?? FALLBACK_DEFAULT_TTL
  }
}
