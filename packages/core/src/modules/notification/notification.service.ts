import type {
  BaseSchema,
  FilterQuery,
  Model,
  NotificationChannelAdapter,
  NotificationChannelResult,
  NotificationQueryOptions,
  NotificationRecipient,
  NotificationSendPayload,
  NotifyDto,
  PaginatedNotifications,
} from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'

import { NOTIFICATION_MODULE_OPTIONS } from './notification.constants'
import type { NotificationModuleOptions } from './notification.module'
import { NotificationSettings } from './notification.settings'
import { Notification } from './schemas/notification.schema'

import { MagnetLogger } from '~/modules/logging/logger.service'
import { SettingsService } from '~/modules/settings/settings.service'

/**
 * Central service for creating and delivering notifications.
 *
 * Supports pluggable channel adapters. The platform (in-app) channel is always
 * built-in — it persists records to the database and powers the admin drawer.
 * Additional channels (e.g. email) are delivered via registered adapters.
 *
 * @example
 * ```typescript
 * // Inject anywhere in core, a plugin, or an app service:
 * constructor(private readonly notificationService: NotificationService) {}
 *
 * // Send to one user on all configured channels:
 * await this.notificationService.notify({
 *   userId: 'user-123',
 *   channels: ['platform', 'email'],
 *   type: 'content.published',
 *   title: 'Article Published',
 *   message: 'Your article "Hello World" has been published.',
 *   href: '/content/posts/hello-world',
 * })
 * ```
 */
@Injectable()
export class NotificationService implements OnModuleInit {
  /** Registered channel adapters keyed by channel name. */
  private readonly adapters: NotificationChannelAdapter[] = []

  constructor(
    @InjectModel(Notification)
    private readonly notificationModel: Model<Notification>,
    private readonly settingsService: SettingsService,
    private readonly moduleRef: ModuleRef,
    private readonly logger: MagnetLogger,
    @Inject(NOTIFICATION_MODULE_OPTIONS)
    private readonly options: NotificationModuleOptions,
  ) {
    this.logger.setContext(NotificationService.name)
  }

  onModuleInit(): void {
    for (const adapter of this.options.adapters ?? []) {
      this.registerAdapter(adapter)
    }
  }

  // -------------------------------------------------------------------------
  // Adapter registration
  // -------------------------------------------------------------------------

  /**
   * Register a channel adapter. Called during module initialisation so plugins
   * can supply adapters before the first notification is sent.
   */
  registerAdapter(adapter: NotificationChannelAdapter): void {
    const existing = this.adapters.findIndex((a) => a.channel === adapter.channel)
    if (existing !== -1) {
      this.adapters.splice(existing, 1)
    }
    this.adapters.push(adapter)
    this.logger.log(`Registered notification adapter for channel '${adapter.channel}'`)
  }

  // -------------------------------------------------------------------------
  // Primary API
  // -------------------------------------------------------------------------

  /**
   * Create and deliver a notification.
   *
   * - Accepts a single `userId` or an array for bulk delivery.
   * - Defaults channels to `['platform']` when not specified.
   * - Silently skips disabled channels per settings; never throws so callers
   *   are not affected by notification failures.
   */
  async notify(dto: NotifyDto): Promise<void> {
    try {
      const settings = await this.settingsService.get(NotificationSettings)
      if (!settings.enabled) {
        return
      }

      const userIds = Array.isArray(dto.userId) ? dto.userId : [dto.userId]
      const channels = dto.channels ?? ['platform']

      await Promise.all(
        userIds.map((userId) => this.deliverToUser({ ...dto, userId, channels }, settings)),
      )
    } catch (error) {
      this.logger.warn(
        `Failed to deliver notification '${dto.type}': ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  // -------------------------------------------------------------------------
  // Query API (platform channel)
  // -------------------------------------------------------------------------

  /**
   * Get notifications for a specific user, newest first.
   */
  async getForUser(
    userId: string,
    options: NotificationQueryOptions = {},
  ): Promise<PaginatedNotifications<Notification>> {
    const limit = options.limit ?? 20
    const offset = options.offset ?? 0

    const filter: FilterQuery<Notification> = { userId }
    if (options.unreadOnly) {
      ;(filter as Record<string, unknown>).read = false
    }

    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel
        .query()
        .where(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec(),
      this.notificationModel.query().where(filter).count(),
      this.notificationModel
        .query()
        .where({ userId, read: false } as FilterQuery<Notification>)
        .count(),
    ])

    return { items, total, unreadCount, limit, offset }
  }

  /**
   * Get the unread notification count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel
      .query()
      .where({ userId, read: false } as FilterQuery<Notification>)
      .count()
  }

  /**
   * Mark a single notification as read.
   * No-ops if the notification doesn't belong to the given user.
   */
  async markAsRead(id: string, userId: string): Promise<void> {
    const notification = await this.notificationModel.findOne({
      id,
      userId,
    } as Partial<Notification>)

    if (!notification) {
      return
    }

    await this.notificationModel.update(
      { id } as Partial<Notification>,
      { read: true, readAt: new Date() } as Partial<Notification>,
    )
  }

  /**
   * Mark all of a user's notifications as read.
   */
  async markAllAsRead(userId: string): Promise<void> {
    const unread = await this.notificationModel
      .query()
      .where({ userId, read: false } as FilterQuery<Notification>)
      .exec()

    const now = new Date()
    await Promise.all(
      unread.map((n) =>
        this.notificationModel.update(
          { id: n.id } as Partial<Notification>,
          { read: true, readAt: now } as Partial<Notification>,
        ),
      ),
    )
  }

  /**
   * Delete notifications older than `retentionDays`.
   * Returns the number of deleted records.
   */
  async cleanup(retentionDays?: number): Promise<number> {
    const settings = await this.settingsService.get(NotificationSettings)
    const days = retentionDays ?? settings.retentionDays
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const old = await this.notificationModel
      .query()
      .where({
        createdAt: { $lt: cutoff },
      } as FilterQuery<Notification>)
      .exec()

    const results = await Promise.all(
      old.map((n) => this.notificationModel.delete({ id: n.id } as Partial<Notification>)),
    )

    return results.filter(Boolean).length
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async deliverToUser(
    dto: NotifyDto & { userId: string; channels: string[] },
    settings: NotificationSettings,
  ): Promise<void> {
    const results: NotificationChannelResult[] = []
    const deliveredChannels: Array<'platform' | 'email'> = []

    // ---- Platform channel (persist to DB) ---------------------------------
    let persistedRecord: BaseSchema<Notification> | null = null
    if (dto.channels.includes('platform') && settings.platformChannelEnabled) {
      persistedRecord = await this.persistPlatformNotification(dto)
      if (persistedRecord) {
        deliveredChannels.push('platform')
        results.push({ channel: 'platform', success: true })
      } else {
        results.push({
          channel: 'platform',
          success: false,
          error: 'Persistence failed',
        })
      }
    }

    // ---- External channel adapters (e.g. email) -------------------------
    const externalChannels = dto.channels.filter((c) => c !== 'platform') as Array<'email'>

    if (externalChannels.length > 0) {
      const sendPayload: NotificationSendPayload = {
        id: persistedRecord?.id ?? `${dto.userId}-${Date.now()}`,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        href: dto.href,
        metadata: dto.metadata,
        createdAt: persistedRecord?.createdAt ?? new Date(),
      }
      const recipient = await this.resolveRecipient(dto.userId)

      for (const channelName of externalChannels) {
        if (channelName === 'email' && !settings.emailChannelEnabled) {
          continue
        }

        const adapter = this.adapters.find((a) => a.channel === channelName)
        if (!adapter) {
          this.logger.debug(`No adapter registered for channel '${channelName}' — skipping`)
          continue
        }

        const result = await adapter.send(sendPayload, recipient)
        results.push(result)
        if (result.success) {
          deliveredChannels.push(channelName)
        }
      }
    }

    this.logger.debug(
      `Notification '${dto.type}' delivered to user '${dto.userId}' via [${deliveredChannels.join(', ')}]`,
    )
  }

  private async persistPlatformNotification(
    dto: NotifyDto & { userId: string },
  ): Promise<BaseSchema<Notification> | null> {
    try {
      return await this.notificationModel.create({
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        href: dto.href,
        metadata: dto.metadata,
        channels: dto.channels ?? ['platform'],
        read: false,
        createdAt: new Date(),
      })
    } catch (error) {
      this.logger.warn(
        `Failed to persist platform notification: ${error instanceof Error ? error.message : String(error)}`,
      )
      return null
    }
  }

  /**
   * Resolve recipient info for external channel delivery.
   * Uses lazy UserService lookup to avoid circular DI.
   */
  private async resolveRecipient(userId: string): Promise<NotificationRecipient> {
    try {
      const userService = this.moduleRef.get('UserService', { strict: false })
      if (userService) {
        const user = await (
          userService as {
            findOneById(id: string): Promise<{ email?: string; name?: string } | null>
          }
        ).findOneById(userId)
        if (user) {
          return { userId, email: user.email, name: user.name }
        }
      }
    } catch {
      // UserService unavailable or user not found — proceed without email
    }
    return { userId }
  }
}
