import type { SentryPluginConfig } from './types'

/**
 * Initialize Sentry instrumentation before NestJS bootstrap.
 *
 * For full performance tracing (HTTP, DB queries), call this function
 * at the very top of your `main.ts` file, BEFORE any other imports.
 *
 * This is an alternative to using `instrument.ts` with Sentry's own
 * initialization pattern. It reads config from the same source as
 * `SentryPlugin.forRoot()`.
 *
 * @example
 * ```typescript
 * // main.ts — call BEFORE other imports
 * import { initSentryInstrumentation } from '@magnet-cms/plugin-sentry'
 * initSentryInstrumentation()
 *
 * // Then import NestJS and the rest of your app
 * import { NestFactory } from '@nestjs/core'
 * import { AppModule } from './app.module'
 *
 * async function bootstrap() {
 *   const app = await NestFactory.create(AppModule)
 *   await app.listen(3000)
 * }
 * bootstrap()
 * ```
 *
 * @param config - Optional Sentry configuration. Defaults to reading
 *   `SENTRY_DSN` and other env vars automatically.
 */
export function initSentryInstrumentation(config?: Partial<SentryPluginConfig>): void {
  try {
    const Sentry = require('@sentry/nestjs') as typeof import('@sentry/nestjs')

    // Skip if already initialized
    if (Sentry.getClient()) return

    Sentry.init({
      dsn: config?.dsn ?? process.env.SENTRY_DSN,
      tracesSampleRate: config?.tracesSampleRate ?? 0.1,
      profileSessionSampleRate: config?.profileSessionSampleRate ?? 1.0,
      environment:
        config?.environment ??
        process.env.SENTRY_ENVIRONMENT ??
        process.env.NODE_ENV ??
        'development',
      release: config?.release ?? process.env.SENTRY_RELEASE,
      debug: config?.debug ?? false,
      enabled: config?.enabled ?? true,
      attachStacktrace: config?.attachStacktrace ?? true,
      maxBreadcrumbs: config?.maxBreadcrumbs ?? 100,
    })
  } catch {
    // @sentry/nestjs is not installed — no-op
  }
}
