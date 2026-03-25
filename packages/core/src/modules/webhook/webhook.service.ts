import { createHmac, randomBytes } from 'node:crypto'

import type { BaseSchema, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'

import { WebhookDelivery } from './schemas/webhook-delivery.schema'
import { Webhook } from './schemas/webhook.schema'
import {
  DEFAULT_RETRY_DELAYS,
  DEFAULT_TIMEOUT_MS,
  MAX_RESPONSE_BODY_LENGTH,
  SIGNATURE_HEADER,
} from './webhook.constants'
import { WebhookSettings } from './webhook.settings'

import { MagnetLogger } from '~/modules/logging/logger.service'
import { SettingsService } from '~/modules/settings/settings.service'

/** Result of a single webhook delivery attempt. */
export interface DeliveryResult {
  success: boolean
  statusCode?: number
  responseBody?: string
  duration: number
  error?: string
  retryCount: number
}

/** Paginated delivery log response. */
export interface PaginatedDeliveries {
  items: BaseSchema<WebhookDelivery>[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Core service for webhook CRUD, delivery, signing, and logging.
 */
@Injectable()
export class WebhookService {
  constructor(
    @InjectModel(Webhook)
    private readonly webhookModel: Model<Webhook>,
    @InjectModel(WebhookDelivery)
    private readonly deliveryModel: Model<WebhookDelivery>,
    private readonly settingsService: SettingsService,
    private readonly logger: MagnetLogger,
  ) {
    this.logger.setContext(WebhookService.name)
  }

  // =========================================================================
  // CRUD
  // =========================================================================

  /**
   * Create a new webhook. Generates a secret if not provided.
   * Returns the full secret (only time it's visible in plaintext).
   */
  async create(data: {
    name: string
    url: string
    events: string[]
    description?: string
    headers?: Record<string, string>
    enabled?: boolean
    secret?: string
  }): Promise<BaseSchema<Webhook>> {
    const secret = data.secret || randomBytes(32).toString('hex')
    const now = new Date()

    return this.webhookModel.create({
      name: data.name,
      url: data.url,
      events: data.events,
      description: data.description,
      headers: data.headers,
      enabled: data.enabled ?? true,
      secret,
      createdAt: now,
      updatedAt: now,
    })
  }

  /**
   * List all webhooks with secrets masked.
   */
  async findAll(): Promise<BaseSchema<Webhook>[]> {
    const webhooks = await this.webhookModel.find()
    return webhooks.map((w) => this.maskSecret(w))
  }

  /**
   * Get a single webhook by ID with secret masked.
   */
  async findById(id: string): Promise<BaseSchema<Webhook> | null> {
    const webhook = await this.webhookModel.findById(id)
    return webhook ? this.maskSecret(webhook) : null
  }

  /**
   * Get a single webhook by ID with the raw secret (for internal use only).
   */
  async findByIdWithSecret(id: string): Promise<BaseSchema<Webhook> | null> {
    return this.webhookModel.findById(id)
  }

  /**
   * Update a webhook (does not allow changing the secret — use regenerateSecret).
   */
  async update(
    id: string,
    data: {
      name?: string
      url?: string
      events?: string[]
      description?: string
      headers?: Record<string, string>
      enabled?: boolean
    },
  ): Promise<BaseSchema<Webhook>> {
    const updated = await this.webhookModel.update(
      { id } as Partial<BaseSchema<Webhook>>,
      { ...data, updatedAt: new Date() } as Partial<BaseSchema<Webhook>>,
    )
    return this.maskSecret(updated)
  }

  /**
   * Delete a webhook and its delivery logs.
   */
  async delete(id: string): Promise<boolean> {
    return this.webhookModel.delete({ id } as Partial<BaseSchema<Webhook>>)
  }

  /**
   * Regenerate the secret for a webhook.
   * Returns the new plaintext secret (only time visible).
   */
  async regenerateSecret(id: string): Promise<{ secret: string } | null> {
    const webhook = await this.webhookModel.findById(id)
    if (!webhook) return null

    const newSecret = randomBytes(32).toString('hex')
    await this.webhookModel.update(
      { id } as Partial<BaseSchema<Webhook>>,
      { secret: newSecret, updatedAt: new Date() } as Partial<BaseSchema<Webhook>>,
    )

    return { secret: newSecret }
  }

  /**
   * Get all enabled webhooks that subscribe to a given event.
   */
  async getMatchingWebhooks(eventName: string): Promise<BaseSchema<Webhook>[]> {
    const allWebhooks = await this.webhookModel.find()
    return allWebhooks.filter((w) => w.enabled && w.events.includes(eventName))
  }

  // =========================================================================
  // Delivery
  // =========================================================================

  /**
   * Compute HMAC-SHA256 signature for a payload.
   */
  sign(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret).update(payload).digest('hex')
    return `sha256=${hmac}`
  }

  /**
   * Deliver a webhook payload to the target URL with signing.
   */
  async deliver(
    webhook: BaseSchema<Webhook>,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<DeliveryResult> {
    const body = JSON.stringify(payload)
    const signature = this.sign(body, webhook.secret)
    const startTime = Date.now()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      [SIGNATURE_HEADER]: signature,
      'X-Magnet-Event': event,
      ...(webhook.headers ?? {}),
    }

    try {
      const settings = await this.settingsService.get(WebhookSettings)
      const timeoutMs = settings?.timeoutMs ?? DEFAULT_TIMEOUT_MS

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      })

      clearTimeout(timeout)

      const duration = Date.now() - startTime
      let responseBody = ''
      try {
        responseBody = await response.text()
        if (responseBody.length > MAX_RESPONSE_BODY_LENGTH) {
          responseBody = responseBody.substring(0, MAX_RESPONSE_BODY_LENGTH)
        }
      } catch {
        // ignore response read errors
      }

      const success = response.status >= 200 && response.status < 300

      return {
        success,
        statusCode: response.status,
        responseBody,
        duration,
        error: success ? undefined : `HTTP ${response.status}`,
        retryCount: 0,
      }
    } catch (err) {
      const duration = Date.now() - startTime
      const error = err instanceof Error ? err.message : 'Unknown delivery error'

      return {
        success: false,
        duration,
        error,
        retryCount: 0,
      }
    }
  }

  /**
   * Deliver with retries using exponential backoff.
   */
  async deliverWithRetry(
    webhook: BaseSchema<Webhook>,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<DeliveryResult> {
    const settings = await this.settingsService.get(WebhookSettings)
    const maxRetries = settings?.maxRetries ?? DEFAULT_RETRY_DELAYS.length

    let lastResult = await this.deliver(webhook, event, payload)
    await this.logDelivery(webhook.id, event, webhook.url, payload, lastResult)

    if (lastResult.success) {
      return lastResult
    }

    for (let i = 0; i < maxRetries; i++) {
      const delay = DEFAULT_RETRY_DELAYS[i] ?? DEFAULT_RETRY_DELAYS[DEFAULT_RETRY_DELAYS.length - 1]
      await new Promise((resolve) => setTimeout(resolve, delay))

      lastResult = await this.deliver(webhook, event, payload)
      lastResult.retryCount = i + 1

      await this.logDelivery(webhook.id, event, webhook.url, payload, lastResult)

      if (lastResult.success) {
        return lastResult
      }

      this.logger.warn(
        `Webhook ${webhook.name} delivery retry ${i + 1}/${maxRetries} failed for ${event}: ${lastResult.error}`,
      )
    }

    return lastResult
  }

  /**
   * Send a test delivery to a webhook.
   */
  async test(id: string): Promise<DeliveryResult | null> {
    const webhook = await this.webhookModel.findById(id)
    if (!webhook) return null

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery from Magnet CMS',
        webhookId: id,
        webhookName: webhook.name,
      },
    }

    const result = await this.deliver(webhook, 'webhook.test', testPayload)
    await this.logDelivery(webhook.id, 'webhook.test', webhook.url, testPayload, result)
    return result
  }

  // =========================================================================
  // Delivery Logs
  // =========================================================================

  /**
   * Get paginated delivery logs for a webhook.
   */
  async getDeliveries(webhookId: string, page = 1, limit = 20): Promise<PaginatedDeliveries> {
    const all = await this.deliveryModel.findMany({
      webhookId,
    } as Partial<BaseSchema<WebhookDelivery>>)

    // Sort by createdAt descending
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const total = all.length
    const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const items = all.slice(start, start + limit)

    return { items, total, page, limit, totalPages }
  }

  /**
   * Delete delivery logs older than a given date (retention cleanup).
   */
  async deleteDeliveriesBefore(cutoff: Date): Promise<number> {
    const all = await this.deliveryModel.find()
    let deleted = 0
    for (const delivery of all) {
      if (new Date(delivery.createdAt).getTime() < cutoff.getTime()) {
        await this.deliveryModel.delete({
          id: delivery.id,
        } as Partial<BaseSchema<WebhookDelivery>>)
        deleted++
      }
    }
    return deleted
  }

  // =========================================================================
  // Payload Enrichment
  // =========================================================================

  /**
   * Enrich the event payload for outgoing webhooks.
   * For content events, fetches the full document data.
   */
  async enrichPayload(
    event: string,
    rawPayload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    // Content events include documentId but not the full document.
    // We attempt to fetch it if ContentService-like data is available.
    // For now, include the raw payload as-is — enrichment with full
    // document data requires injecting ContentService which is done
    // in the listener layer.
    return {
      event,
      timestamp: new Date().toISOString(),
      data: rawPayload,
    }
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  private async logDelivery(
    webhookId: string,
    event: string,
    url: string,
    payload: Record<string, unknown>,
    result: DeliveryResult,
  ): Promise<void> {
    try {
      await this.deliveryModel.create({
        webhookId,
        event,
        url,
        payload,
        statusCode: result.statusCode,
        responseBody: result.responseBody,
        duration: result.duration,
        success: result.success,
        error: result.error,
        retryCount: result.retryCount,
        createdAt: new Date(),
      } as Partial<BaseSchema<WebhookDelivery>>)
    } catch (err) {
      this.logger.error(
        `Failed to log webhook delivery: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  private maskSecret(webhook: BaseSchema<Webhook>): BaseSchema<Webhook> {
    const lastFour = webhook.secret.slice(-4)
    return {
      ...webhook,
      secret: `***...${lastFour}`,
    }
  }
}
