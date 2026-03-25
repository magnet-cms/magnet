import type { CacheHealthResult, CacheMagnetProvider, EnvVarRequirement } from '@magnet-cms/common'
import { CacheAdapter } from '@magnet-cms/common'
import Redis from 'ioredis'

export interface RedisCacheAdapterConfig {
  /** Redis connection URL (e.g., redis://localhost:6379). Takes precedence over host/port. */
  url?: string
  /** Redis host (default: localhost) */
  host?: string
  /** Redis port (default: 6379) */
  port?: number
  /** Redis password */
  password?: string
  /** Redis database index (default: 0) */
  db?: number
  /** Key prefix for all cache entries (default: '') */
  keyPrefix?: string
}

/**
 * Redis-based cache adapter using ioredis.
 *
 * Compatible with Redis 6+ and Dragonfly (Redis wire-compatible).
 * Uses SCAN for safe pattern-based deletion (never KEYS in production).
 *
 * @example
 * ```typescript
 * MagnetModule.forRoot([
 *   RedisCacheAdapter.forRoot({ url: process.env.REDIS_URL }),
 * ])
 * ```
 */
export class RedisCacheAdapter extends CacheAdapter {
  readonly name = 'redis'
  private readonly redis: Redis
  private readonly keyPrefix: string

  /** Environment variables used by this adapter */
  static readonly envVars: EnvVarRequirement[] = [
    {
      name: 'CACHE_REDIS_URL',
      required: false,
      description: 'Redis connection URL for cache (falls back to REDIS_URL)',
    },
    {
      name: 'REDIS_URL',
      required: false,
      description: 'Generic Redis connection URL (fallback for CACHE_REDIS_URL)',
    },
  ]

  constructor(config: RedisCacheAdapterConfig = {}) {
    super()
    this.keyPrefix = config.keyPrefix ?? ''

    const url = config.url ?? process.env.CACHE_REDIS_URL ?? process.env.REDIS_URL

    if (url) {
      this.redis = new Redis(url, { lazyConnect: true })
    } else {
      this.redis = new Redis({
        host: config.host ?? 'localhost',
        port: config.port ?? 6379,
        password: config.password,
        db: config.db ?? 0,
        lazyConnect: true,
      })
    }

    // Suppress unhandled error events (connections are lazy)
    this.redis.on('error', () => {
      // Errors are surfaced via method calls
    })
  }

  /**
   * Create a configured cache provider for MagnetModule.forRoot().
   * Auto-resolves connection from CACHE_REDIS_URL or REDIS_URL env vars.
   *
   * @example
   * ```typescript
   * MagnetModule.forRoot([
   *   RedisCacheAdapter.forRoot(),
   *   // or with explicit config:
   *   RedisCacheAdapter.forRoot({ url: 'redis://localhost:6379', keyPrefix: 'myapp:' }),
   * ])
   * ```
   */
  static forRoot(config: RedisCacheAdapterConfig = {}): CacheMagnetProvider {
    return {
      type: 'cache',
      adapter: new RedisCacheAdapter(config),
      envVars: RedisCacheAdapter.envVars,
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(this.prefixKey(key))
    if (raw === null) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value)
    const prefixed = this.prefixKey(key)
    if (ttl !== undefined) {
      await this.redis.set(prefixed, serialized, 'EX', ttl)
    } else {
      await this.redis.set(prefixed, serialized)
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(this.prefixKey(key))
  }

  async deleteByPattern(pattern: string): Promise<void> {
    await this.scanAndDelete(this.prefixKey(pattern))
  }

  async has(key: string): Promise<boolean> {
    const count = await this.redis.exists(this.prefixKey(key))
    return count > 0
  }

  async clear(): Promise<void> {
    const pattern = this.keyPrefix ? `${this.keyPrefix}*` : '*'
    await this.scanAndDelete(pattern)
  }

  async healthCheck(): Promise<CacheHealthResult> {
    try {
      await this.redis.ping()
      return { healthy: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { healthy: false, message }
    }
  }

  async dispose(): Promise<void> {
    await this.redis.quit()
  }

  private prefixKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}${key}` : key
  }

  /** SCAN-based deletion — safe for production (never uses KEYS) */
  private async scanAndDelete(pattern: string): Promise<void> {
    let cursor = '0'
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = nextCursor
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } while (cursor !== '0')
  }
}
