import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common'
import { WebhookVerificationError, validateEvent } from '@polar-sh/sdk/webhooks'

import { PolarWebhookService } from './polar-webhook.service'
import { PolarService } from './polar.service'

/**
 * Polar Webhook Controller
 *
 * Receives webhook events from Polar, verifies signatures via standardwebhooks,
 * and delegates processing to the webhook service.
 *
 * IMPORTANT: Consumer apps must enable rawBody in NestFactory.create():
 * `NestFactory.create(AppModule, { rawBody: true })`
 */
@Controller('polar/webhooks')
export class PolarWebhookController {
  constructor(
    private readonly polarService: PolarService,
    private readonly webhookService: PolarWebhookService,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: { rawBody?: Buffer; headers: Record<string, string> },
    @Headers() headers: Record<string, string>,
  ): Promise<{ received: boolean }> {
    this.polarService.verifyRawBodyAvailable(req)

    const { webhookSecret } = this.polarService.pluginConfig
    if (!webhookSecret) {
      throw new Error('[PolarPlugin] webhookSecret is required for webhook verification')
    }

    let event: ReturnType<typeof validateEvent>
    try {
      event = validateEvent(req.rawBody.toString(), headers, webhookSecret)
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        throw error
      }
      throw error
    }

    await this.webhookService.processEvent(event)

    return { received: true }
  }
}
