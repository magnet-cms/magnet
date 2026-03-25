import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'

import { SENTRY_OPTIONS } from './constants'
import { SentryAdminController } from './controllers/sentry-admin.controller'
import { SentryConfigController } from './controllers/sentry-config.controller'
import { SentryContextInterceptor } from './interceptors/sentry-context.interceptor'
import { SentryApiService } from './services/sentry-api.service'
import type { SentryPluginConfig } from './types'

// Re-export so existing consumers importing from sentry.module still work
export { SENTRY_OPTIONS } from './constants'

/**
 * Sentry Plugin NestJS Module
 *
 * Registered automatically when SentryPlugin is added to MagnetModule.forRoot().
 * The plugin system imports this class directly (via the module factory in @Plugin),
 * so ALL providers and controllers MUST be declared in the @Module({}) decorator —
 * not in a static forFeature() method. NestJS reads the @Module({}) metadata
 * directly and does not call any static methods.
 *
 * useFactory for SENTRY_OPTIONS enables lazy resolution — the factory is called
 * during DI resolution (after forRoot() has set SentryPlugin._resolvedConfig),
 * not at class-definition time.
 */
@Module({
  controllers: [SentryConfigController, SentryAdminController],
  providers: [
    {
      provide: SENTRY_OPTIONS,
      // useFactory (not useValue) — factory is called lazily during DI resolution,
      // after SentryPlugin.forRoot() has stored the config on the static field.
      useFactory: (): SentryPluginConfig => {
        const { SentryPlugin } = require('./plugin') as {
          SentryPlugin: { _resolvedConfig: SentryPluginConfig | undefined }
        }
        return SentryPlugin._resolvedConfig ?? {}
      },
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryContextInterceptor,
    },
    SentryApiService,
  ],
  exports: [SentryApiService],
})
export class SentryModule {}
