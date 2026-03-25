import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MemoryCacheAdapter } from '../memory-cache.adapter'

describe('MemoryCacheAdapter', () => {
  let adapter: MemoryCacheAdapter

  beforeEach(() => {
    adapter = new MemoryCacheAdapter({ maxEntries: 5, cleanupIntervalMs: 0 })
  })

  afterEach(async () => {
    await adapter.dispose()
  })

  it('should have name "memory"', () => {
    expect(adapter.name).toBe('memory')
  })

  describe('get / set', () => {
    it('should return null for missing key', async () => {
      expect(await adapter.get('missing')).toBeNull()
    })

    it('should store and retrieve a value', async () => {
      await adapter.set('key1', { foo: 'bar' })
      expect(await adapter.get('key1')).toEqual({ foo: 'bar' })
    })

    it('should return null after TTL expires', async () => {
      await adapter.set('ttl-key', 'value', 0.01) // 10ms TTL
      await new Promise((r) => setTimeout(r, 20))
      expect(await adapter.get('ttl-key')).toBeNull()
    })

    it('should use default TTL when not specified', async () => {
      const a = new MemoryCacheAdapter({
        defaultTtl: 0.01,
        cleanupIntervalMs: 0,
      })
      await a.set('k', 'v')
      await new Promise((r) => setTimeout(r, 20))
      expect(await a.get('k')).toBeNull()
      await a.dispose()
    })
  })

  describe('has', () => {
    it('should return false for missing key', async () => {
      expect(await adapter.has('nope')).toBe(false)
    })

    it('should return true for existing key', async () => {
      await adapter.set('exists', 1)
      expect(await adapter.has('exists')).toBe(true)
    })

    it('should return false for expired key', async () => {
      await adapter.set('expired', 1, 0.01)
      await new Promise((r) => setTimeout(r, 20))
      expect(await adapter.has('expired')).toBe(false)
    })
  })

  describe('delete', () => {
    it('should remove a key', async () => {
      await adapter.set('del-me', 42)
      await adapter.delete('del-me')
      expect(await adapter.get('del-me')).toBeNull()
    })

    it('should not throw when deleting missing key', async () => {
      await expect(adapter.delete('ghost')).resolves.toBeUndefined()
    })
  })

  describe('deleteByPattern', () => {
    it('should delete keys matching glob pattern', async () => {
      await adapter.set('posts:1', 'a')
      await adapter.set('posts:2', 'b')
      await adapter.set('users:1', 'c')
      await adapter.deleteByPattern('posts:*')
      expect(await adapter.get('posts:1')).toBeNull()
      expect(await adapter.get('posts:2')).toBeNull()
      expect(await adapter.get('users:1')).toBe('c')
    })

    it('should handle exact pattern match', async () => {
      await adapter.set('exact', 'val')
      await adapter.deleteByPattern('exact')
      expect(await adapter.get('exact')).toBeNull()
    })

    it('should handle pattern with no matches gracefully', async () => {
      await expect(adapter.deleteByPattern('no:match:*')).resolves.toBeUndefined()
    })
  })

  describe('clear', () => {
    it('should remove all entries', async () => {
      await adapter.set('a', 1)
      await adapter.set('b', 2)
      await adapter.clear()
      expect(await adapter.get('a')).toBeNull()
      expect(await adapter.get('b')).toBeNull()
    })
  })

  describe('LRU eviction', () => {
    it('should evict least recently used entry when maxEntries exceeded', async () => {
      // Fill to max (5)
      for (let i = 1; i <= 5; i++) {
        await adapter.set(`key${i}`, i)
      }
      // Access key1 to make it recently used
      await adapter.get('key1')
      // Add one more — should evict key2 (LRU)
      await adapter.set('key6', 6)
      expect(await adapter.get('key2')).toBeNull()
      expect(await adapter.get('key1')).toBe(1)
      expect(await adapter.get('key6')).toBe(6)
    })
  })

  describe('healthCheck', () => {
    it('should return healthy', async () => {
      const result = await adapter.healthCheck()
      expect(result.healthy).toBe(true)
    })
  })
})
