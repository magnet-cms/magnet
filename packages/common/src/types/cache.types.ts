// ============================================================================
// Cache Types
// ============================================================================

/**
 * Result of a cache health check
 */
export interface CacheHealthResult {
  /** Whether the cache adapter is healthy and reachable */
  healthy: boolean
  /** Optional message with details about the health status */
  message?: string
}

// ============================================================================
// Cache Adapter Abstract Class
// ============================================================================

/**
 * Abstract base class for cache adapters.
 *
 * All cache providers must extend this class and implement the abstract methods.
 * Follows the same pattern as `StorageAdapter`, `EmailAdapter`, and `DatabaseAdapter`.
 *
 * @example
 * ```typescript
 * export class MemoryCacheAdapter extends CacheAdapter {
 *   readonly name = 'memory'
 *
 *   async get<T>(key: string): Promise<T | null> {
 *     // Return cached value or null
 *   }
 *
 *   async set<T>(key: string, value: T, ttl?: number): Promise<void> {
 *     // Store value with optional TTL in seconds
 *   }
 *
 *   // ... other methods
 * }
 * ```
 */
export abstract class CacheAdapter {
  /**
   * Unique identifier for this adapter
   */
  abstract readonly name: string

  /**
   * Retrieve a cached value by key.
   * @param key - Cache key
   * @returns The cached value, or null if not found or expired
   */
  abstract get<T>(key: string): Promise<T | null>

  /**
   * Store a value in the cache.
   * @param key - Cache key
   * @param value - Value to cache (must be JSON-serializable)
   * @param ttl - Time-to-live in seconds. If omitted, uses adapter default.
   */
  abstract set<T>(key: string, value: T, ttl?: number): Promise<void>

  /**
   * Remove a value from the cache by key.
   * @param key - Cache key to delete
   */
  abstract delete(key: string): Promise<void>

  /**
   * Remove all cache entries matching a glob pattern.
   * Supports `*` wildcards (e.g., `content:posts:*` removes all post entries).
   * @param pattern - Glob pattern to match keys against
   */
  abstract deleteByPattern(pattern: string): Promise<void>

  /**
   * Check if a key exists in the cache (and has not expired).
   * @param key - Cache key to check
   * @returns true if the key exists and is not expired
   */
  abstract has(key: string): Promise<boolean>

  /**
   * Remove all entries from the cache.
   * For Redis, only clears keys within this adapter's key prefix.
   */
  abstract clear(): Promise<void>

  /**
   * Check the health of the cache backend.
   * @returns Health result with status and optional message
   */
  abstract healthCheck(): Promise<CacheHealthResult>

  /**
   * Optional cleanup/disconnect method.
   * Called when the module is destroyed.
   */
  dispose?(): Promise<void>
}
