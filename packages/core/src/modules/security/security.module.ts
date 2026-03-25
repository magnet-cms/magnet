import type { MiddlewareConsumer, NestModule } from '@nestjs/common'
import { Module } from '@nestjs/common'
import helmet from 'helmet'

/**
 * Applies helmet security headers globally via NestJS middleware.
 *
 * Helmet defaults enabled (X-Content-Type-Options, X-Frame-Options,
 * Strict-Transport-Security, X-XSS-Protection, etc.).
 *
 * CSP is disabled — it varies per deployment, and the Vite-built admin
 * bundle requires inline scripts/styles that would need per-project CSP config.
 * Users can add their own CSP in their application's main.ts via app.use(helmet({ contentSecurityPolicy: {...} })).
 *
 * CORP is set to cross-origin so admin UI assets load from different origins
 * in development environments.
 */
@Module({})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        helmet({
          contentSecurityPolicy: false,
          crossOriginResourcePolicy: { policy: 'cross-origin' },
        }),
      )
      .forRoutes('*')
  }
}
