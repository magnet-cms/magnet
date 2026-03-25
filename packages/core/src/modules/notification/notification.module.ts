import type { NotificationChannelAdapter } from '@magnet-cms/common'
import { type DynamicModule, Module } from '@nestjs/common'

import { NOTIFICATION_MODULE_OPTIONS } from './notification.constants'
import { NotificationController } from './notification.controller'
import { NotificationService } from './notification.service'
import { NotificationSettings } from './notification.settings'
import { Notification } from './schemas/notification.schema'

import { DatabaseModule } from '~/modules/database'
import { SettingsModule } from '~/modules/settings'

/**
 * Options for configuring the NotificationModule.
 */
export interface NotificationModuleOptions {
  /**
   * External channel adapters to register on startup (e.g. email adapter).
   * Each adapter's `channel` property determines which delivery channel it handles.
   */
  adapters?: NotificationChannelAdapter[]
}

export { NOTIFICATION_MODULE_OPTIONS }

/**
 * Handles in-app and multi-channel notifications.
 *
 * Always provides a platform (in-app) channel backed by the database.
 * Additional channels (email, etc.) are enabled by passing adapters via `forRoot`.
 *
 * @example
 * ```typescript
 * // Basic — platform channel only:
 * NotificationModule.forRoot()
 *
 * // With a custom email adapter:
 * NotificationModule.forRoot({ adapters: [new NodemailerAdapter(smtpConfig)] })
 * ```
 */
@Module({})
export class NotificationModule {
  static forRoot(options: NotificationModuleOptions = {}): DynamicModule {
    return {
      module: NotificationModule,
      imports: [
        DatabaseModule.forFeature(Notification),
        SettingsModule.forFeature(NotificationSettings),
      ],
      controllers: [NotificationController],
      providers: [
        {
          provide: NOTIFICATION_MODULE_OPTIONS,
          useValue: options,
        },
        NotificationService,
      ],
      exports: [NotificationService],
    }
  }
}
