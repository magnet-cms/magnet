import type { BaseSchema } from '@magnet-cms/common'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common'

import type { Webhook } from './schemas/webhook.schema'
import type { DeliveryResult, PaginatedDeliveries } from './webhook.service'
import { WebhookService } from './webhook.service'

import { RestrictedRoute } from '~/decorators/restricted.route'
import { getEventContext } from '~/modules/events/event-context.interceptor'
import { EventService } from '~/modules/events/event.service'

interface CreateWebhookDto {
  name: string
  url: string
  events: string[]
  description?: string
  headers?: Record<string, string>
  enabled?: boolean
}

interface UpdateWebhookDto {
  name?: string
  url?: string
  events?: string[]
  description?: string
  headers?: Record<string, string>
  enabled?: boolean
}

/**
 * Admin REST API for managing webhooks.
 *
 * All endpoints require authentication (RestrictedRoute).
 * Secrets are masked in GET responses — only visible on create and regenerate.
 */
@Controller('webhooks')
@RestrictedRoute()
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly eventService: EventService,
  ) {}

  /**
   * GET /webhooks
   * List all configured webhooks (secrets masked).
   */
  @Get()
  async list(): Promise<BaseSchema<Webhook>[]> {
    return this.webhookService.findAll()
  }

  /**
   * GET /webhooks/:id
   * Get a single webhook by ID (secret masked).
   */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<BaseSchema<Webhook>> {
    const webhook = await this.webhookService.findById(id)
    if (!webhook) throw new NotFoundException('Webhook not found')
    return webhook
  }

  /**
   * POST /webhooks
   * Create a new webhook. Returns the full secret (only time visible).
   */
  @Post()
  async create(@Body() body: CreateWebhookDto): Promise<BaseSchema<Webhook>> {
    const webhook = await this.webhookService.create(body)

    await this.eventService.emit(
      'webhook.created',
      {
        webhookId: webhook.id,
        url: webhook.url,
        events: webhook.events,
      },
      getEventContext(),
    )

    return webhook
  }

  /**
   * PUT /webhooks/:id
   * Update a webhook (cannot change secret — use regenerate-secret endpoint).
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateWebhookDto,
  ): Promise<BaseSchema<Webhook>> {
    const existing = await this.webhookService.findById(id)
    if (!existing) throw new NotFoundException('Webhook not found')

    const updated = await this.webhookService.update(id, body)

    await this.eventService.emit(
      'webhook.updated',
      {
        webhookId: id,
        url: updated.url,
        events: updated.events,
      },
      getEventContext(),
    )

    return updated
  }

  /**
   * DELETE /webhooks/:id
   * Delete a webhook.
   */
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    const existing = await this.webhookService.findById(id)
    if (!existing) throw new NotFoundException('Webhook not found')

    await this.webhookService.delete(id)

    await this.eventService.emit(
      'webhook.deleted',
      {
        webhookId: id,
        url: existing.url,
        events: existing.events,
      },
      getEventContext(),
    )

    return { success: true }
  }

  /**
   * POST /webhooks/:id/regenerate-secret
   * Regenerate the HMAC secret. Returns the new plaintext secret.
   */
  @Post(':id/regenerate-secret')
  @HttpCode(HttpStatus.OK)
  async regenerateSecret(@Param('id') id: string): Promise<{ secret: string }> {
    const result = await this.webhookService.regenerateSecret(id)
    if (!result) throw new NotFoundException('Webhook not found')
    return result
  }

  /**
   * POST /webhooks/:id/test
   * Send a test payload to the webhook and return the delivery result.
   */
  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  async test(@Param('id') id: string): Promise<DeliveryResult> {
    const result = await this.webhookService.test(id)
    if (!result) throw new NotFoundException('Webhook not found')
    return result
  }

  /**
   * GET /webhooks/:id/deliveries
   * Get paginated delivery logs for a webhook.
   */
  @Get(':id/deliveries')
  async getDeliveries(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedDeliveries> {
    const existing = await this.webhookService.findById(id)
    if (!existing) throw new NotFoundException('Webhook not found')

    return this.webhookService.getDeliveries(
      id,
      page ? Number.parseInt(page, 10) : 1,
      limit ? Number.parseInt(limit, 10) : 20,
    )
  }
}
