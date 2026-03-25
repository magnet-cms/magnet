import type { BaseEventPayload, EventName } from '@magnet-cms/common'
import { Injectable, OnModuleInit, Optional } from '@nestjs/common'

import { WebhookService } from './webhook.service'
import { WebhookSettings } from './webhook.settings'

import { ContentService } from '~/modules/content/content.service'
import { EventService } from '~/modules/events/event.service'
import { MagnetLogger } from '~/modules/logging/logger.service'
import { SettingsService } from '~/modules/settings/settings.service'

/**
 * All event names that the webhook listener dispatches.
 * Excludes webhook.* events to prevent reflexive delivery loops.
 */
const DISPATCHABLE_EVENTS: EventName[] = [
  // Content events
  'content.created',
  'content.updated',
  'content.deleted',
  'content.published',
  'content.unpublished',
  'content.version.created',
  'content.version.restored',
  // User events
  'user.created',
  'user.updated',
  'user.deleted',
  'user.registered',
  'user.login',
  'user.logout',
  'user.logout_all',
  'user.password_changed',
  'user.password_reset_requested',
  'user.password_reset',
  'user.password_reset_completed',
  'user.email_verification_requested',
  'user.email_verified',
  'user.session_revoked',
  // Auth events
  'auth.token_refreshed',
  'auth.session_created',
  'auth.session_revoked',
  'auth.failed_login_attempt',
  // Role events
  'role.created',
  'role.updated',
  'role.deleted',
  'role.permissions_updated',
  'role.user_assigned',
  // Settings events
  'settings.updated',
  'settings.group_updated',
  // Media events
  'media.uploaded',
  'media.deleted',
  'media.folder_created',
  'media.folder_deleted',
  // API Key events
  'api_key.created',
  'api_key.revoked',
  'api_key.used',
  // Plugin events
  'plugin.initialized',
  'plugin.destroyed',
  // Notification events
  'notification.created',
  // System events
  'system.startup',
  'system.shutdown',
]

/**
 * Service that listens to all system events and dispatches
 * matching webhooks asynchronously.
 *
 * Registers handlers for every event type (except webhook.*)
 * on module initialization via EventService.on().
 */
@Injectable()
export class WebhookListenerService implements OnModuleInit {
  private readonly unsubscribers: Array<() => void> = []

  constructor(
    private readonly eventService: EventService,
    private readonly webhookService: WebhookService,
    private readonly settingsService: SettingsService,
    private readonly logger: MagnetLogger,
    @Optional() private readonly contentService?: ContentService,
  ) {
    this.logger.setContext(WebhookListenerService.name)
  }

  async onModuleInit(): Promise<void> {
    this.registerEventHandlers()
    await this.cleanupOldDeliveries()
  }

  private async cleanupOldDeliveries(): Promise<void> {
    try {
      const settings = await this.settingsService.get(WebhookSettings)
      const retentionDays = settings.retentionDays ?? 30
      const cutoff = new Date(Date.now() - retentionDays * 86_400_000)
      await this.webhookService.deleteDeliveriesBefore(cutoff)
      this.logger.log(`Cleaned up delivery logs older than ${retentionDays} days`)
    } catch (err) {
      this.logger.warn(
        `Failed to cleanup old deliveries: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  private registerEventHandlers(): void {
    for (const eventName of DISPATCHABLE_EVENTS) {
      const unsubscribe = this.eventService.on(
        eventName,
        (payload: BaseEventPayload) => this.handleEvent(eventName, payload),
        { async: true, name: `webhook-dispatcher:${eventName}` },
      )
      this.unsubscribers.push(unsubscribe)
    }

    this.logger.log(
      `Registered webhook dispatch handlers for ${DISPATCHABLE_EVENTS.length} event types`,
    )
  }

  private async handleEvent(eventName: EventName, payload: BaseEventPayload): Promise<void> {
    try {
      // Check if webhooks are globally enabled
      const settings = await this.settingsService.get(WebhookSettings)
      if (!settings.enabled) return

      // Find matching enabled webhooks
      const webhooks = await this.webhookService.getMatchingWebhooks(eventName)
      if (webhooks.length === 0) return

      this.logger.debug(`Dispatching event '${eventName}' to ${webhooks.length} webhook(s)`)

      // Build the outgoing payload, enriching content events with full document
      const rawPayload = payload as unknown as Record<string, unknown>
      let enrichedData = rawPayload

      if (
        eventName.startsWith('content.') &&
        this.contentService &&
        rawPayload.documentId &&
        rawPayload.schema
      ) {
        try {
          const doc = await this.contentService.findDraft(
            rawPayload.schema as string,
            rawPayload.documentId as string,
          )
          if (doc) {
            enrichedData = { ...rawPayload, document: doc }
          }
        } catch {
          // Content fetch failed — send raw payload
        }
      }

      const outgoingPayload = await this.webhookService.enrichPayload(eventName, enrichedData)

      // Dispatch all matching webhooks in parallel (fire-and-forget)
      const deliveries = webhooks.map(async (webhook) => {
        try {
          const fullWebhook = await this.webhookService.findByIdWithSecret(webhook.id)
          if (!fullWebhook) return

          await this.webhookService.deliverWithRetry(fullWebhook, eventName, outgoingPayload)
        } catch (err) {
          this.logger.error(
            `Webhook '${webhook.name}' delivery failed for '${eventName}': ${err instanceof Error ? err.message : String(err)}`,
          )
        }
      })

      // Don't await — fire and forget
      Promise.all(deliveries).catch(() => {
        // Errors already logged per-webhook
      })
    } catch (err) {
      this.logger.error(
        `Webhook dispatch error for '${eventName}': ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }
}
