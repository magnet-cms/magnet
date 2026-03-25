import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common'

import { StripeWebhookService } from './stripe-webhook.service'
import { StripeService } from './stripe.service'

/**
 * Stripe Webhook Controller
 *
 * Receives webhook events from Stripe, verifies signatures,
 * and delegates processing to the webhook service.
 *
 * IMPORTANT: Consumer apps must enable rawBody in NestFactory.create():
 * `NestFactory.create(AppModule, { rawBody: true })`
 */
@Controller('stripe/webhooks')
export class StripeWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly webhookService: StripeWebhookService,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    this.stripeService.verifyRawBodyAvailable(req)

    const { webhookSecret } = this.stripeService.pluginConfig
    if (!webhookSecret) {
      throw new Error('[StripePlugin] webhookSecret is required for webhook verification')
    }

    const event = this.stripeService.client.webhooks.constructEvent(
      req.rawBody,
      signature,
      webhookSecret,
    )

    await this.webhookService.processEvent(event)

    return { received: true }
  }
}
