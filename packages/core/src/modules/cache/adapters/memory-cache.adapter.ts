import type { CacheAdapter, CacheHealthResult } from '@magnet-cms/common'

interface CacheEntry {
	value: unknown
	expiresAt: number
}

export interface MemoryCacheAdapterOptions {
	/** Maximum number of cache entries before LRU eviction (default: 1000) */
	maxEntries?: number
	/** Default TTL in seconds (default: 300) */
	defaultTtl?: number
	/** Interval in ms for periodic expired-entry cleanup (default: 60000). Set to 0 to disable. */
	cleanupIntervalMs?: number
}

/**
 * Built-in in-memory cache adapter with TTL and LRU eviction.
 *
 * Uses a Map with insertion-order tracking for LRU. Suitable for single-process
 * deployments or development. For multi-instance deployments, use RedisCacheAdapter.
 */
export class MemoryCacheAdapter implements CacheAdapter {
	readonly name = 'memory'

	private readonly store = new Map<string, CacheEntry>()
	/** Tracks access order for LRU: front = oldest, back = most recently used */
	private readonly accessOrder: string[] = []
	private readonly maxEntries: number
	private readonly defaultTtl: number
	private cleanupTimer: ReturnType<typeof setInterval> | null = null

	constructor(options: MemoryCacheAdapterOptions = {}) {
		this.maxEntries = options.maxEntries ?? 1000
		this.defaultTtl = options.defaultTtl ?? 300
		const intervalMs = options.cleanupIntervalMs ?? 60_000
		if (intervalMs > 0) {
			this.cleanupTimer = setInterval(() => this.cleanup(), intervalMs)
			// Don't block process exit
			if (this.cleanupTimer.unref) {
				this.cleanupTimer.unref()
			}
		}
	}

	async get<T>(key: string): Promise<T | null> {
		const entry = this.store.get(key)
		if (!entry) return null
		if (Date.now() > entry.expiresAt) {
			this.evictKey(key)
			return null
		}
		this.touchAccess(key)
		return entry.value as T
	}

	async set<T>(key: string, value: T, ttl?: number): Promise<void> {
		const resolvedTtl = ttl ?? this.defaultTtl
		const expiresAt = Date.now() + resolvedTtl * 1000

		if (this.store.has(key)) {
			this.store.set(key, { value, expiresAt })
			this.touchAccess(key)
		} else {
			// Evict LRU if at capacity
			if (this.store.size >= this.maxEntries) {
				this.evictLru()
			}
			this.store.set(key, { value, expiresAt })
			this.accessOrder.push(key)
		}
	}

	async delete(key: string): Promise<void> {
		this.evictKey(key)
	}

	async deleteByPattern(pattern: string): Promise<void> {
		const regex = globToRegex(pattern)
		for (const key of [...this.store.keys()]) {
			if (regex.test(key)) {
				this.evictKey(key)
			}
		}
	}

	async has(key: string): Promise<boolean> {
		const entry = this.store.get(key)
		if (!entry) return false
		if (Date.now() > entry.expiresAt) {
			this.evictKey(key)
			return false
		}
		return true
	}

	async clear(): Promise<void> {
		this.store.clear()
		this.accessOrder.length = 0
	}

	async healthCheck(): Promise<CacheHealthResult> {
		return {
			healthy: true,
			message: `memory adapter — ${this.store.size} entries`,
		}
	}

	async dispose(): Promise<void> {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer)
			this.cleanupTimer = null
		}
		this.store.clear()
		this.accessOrder.length = 0
	}

	/**
	 * Mark key as most recently used.
	 * O(n) per access — acceptable for the default maxEntries=1000 with low-traffic workloads.
	 * For high-throughput production use, consider the Redis adapter instead.
	 */
	private touchAccess(key: string): void {
		const idx = this.accessOrder.indexOf(key)
		if (idx !== -1) {
			this.accessOrder.splice(idx, 1)
		}
		this.accessOrder.push(key)
	}

	/** Remove a specific key from store and accessOrder */
	private evictKey(key: string): void {
		this.store.delete(key)
		const idx = this.accessOrder.indexOf(key)
		if (idx !== -1) {
			this.accessOrder.splice(idx, 1)
		}
	}

	/** Evict the least recently used entry */
	private evictLru(): void {
		// Find first non-expired entry from front of accessOrder
		while (this.accessOrder.length > 0) {
			const oldest = this.accessOrder[0]
			if (oldest === undefined) break
			this.accessOrder.shift()
			if (this.store.has(oldest)) {
				this.store.delete(oldest)
				return
			}
		}
	}

	/** Remove all expired entries (periodic cleanup) */
	private cleanup(): void {
		const now = Date.now()
		for (const [key, entry] of this.store) {
			if (now > entry.expiresAt) {
				this.evictKey(key)
			}
		}
	}
}

/**
 * Convert a glob pattern (with * wildcards) to a RegExp.
 * Only supports `*` (match any characters except nothing special).
 */
function globToRegex(pattern: string): RegExp {
	const escaped = pattern
		.replace(/[.+^${}()|[\]\\]/g, '\\$&')
		.replace(/\*/g, '.*')
	return new RegExp(`^${escaped}$`)
}
