import type { ApiClient } from '../helpers/api-client'

type CleanupFn = () => Promise<unknown>

/**
 * Tracks created resources during a test and deletes them in reverse order
 * after the test completes — even if the test fails.
 */
export class CleanupManager {
  private readonly cleanupStack: CleanupFn[] = []

  /**
   * Register a cleanup function to be called after the test.
   * Functions are called in LIFO order (most recently registered first).
   */
  register(fn: CleanupFn): void {
    this.cleanupStack.push(fn)
  }

  /**
   * Register a content document for cleanup.
   */
  trackContent(client: ApiClient, schema: string, documentId: string): void {
    this.register(async () => {
      await client.deleteContent(schema, documentId).catch(() => {
        // Ignore errors — document may already be deleted
      })
    })
  }

  /**
   * Register a media item for cleanup.
   */
  trackMedia(client: ApiClient, mediaId: string): void {
    this.register(async () => {
      await client.deleteMedia(mediaId).catch(() => {
        // Ignore errors — item may already be deleted
      })
    })
  }

  /**
   * Register a user for cleanup.
   */
  trackUser(client: ApiClient, userId: string): void {
    this.register(async () => {
      await client.deleteUser(userId).catch(() => {
        // Ignore errors — user may already be deleted
      })
    })
  }

  /**
   * Execute all registered cleanup functions in reverse order.
   * Errors are logged but do not abort remaining cleanups.
   */
  async cleanup(): Promise<void> {
    const fns = [...this.cleanupStack].reverse()
    this.cleanupStack.length = 0
    for (const fn of fns) {
      try {
        await fn()
      } catch (error) {
        console.warn('[CleanupManager] Cleanup error (ignored):', error)
      }
    }
  }
}
