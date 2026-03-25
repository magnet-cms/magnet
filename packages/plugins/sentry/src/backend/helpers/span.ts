/**
 * Wrap an async function in a Sentry performance span.
 *
 * This is a no-op when @sentry/nestjs is not installed or Sentry is
 * not initialized — the callback always executes regardless.
 *
 * @param name - Span name (shown in Sentry performance UI)
 * @param op - Span operation type (e.g., 'db.query', 'http.request', 'function')
 * @param fn - Async function to instrument
 *
 * @example
 * ```typescript
 * const result = await withSentrySpan('process-order', 'function', async () => {
 *   return processOrder(orderId)
 * })
 * ```
 */
export async function withSentrySpan<T>(
  name: string,
  op: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    const Sentry = require('@sentry/nestjs') as typeof import('@sentry/nestjs')
    if (!Sentry.getClient()) return fn()

    return await Sentry.startSpan({ name, op }, () => fn())
  } catch {
    // @sentry/nestjs not installed or Sentry not initialized — run callback directly
    return fn()
  }
}
