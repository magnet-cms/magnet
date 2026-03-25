import { Injectable } from '@nestjs/common'

import { StripeService } from '../stripe.service'
import type { CreateCheckoutDto, SessionResponse } from '../types'

@Injectable()
export class StripeCheckoutService {
  constructor(private readonly stripeService: StripeService) {}

  /**
   * Create a Stripe Checkout session.
   */
  async createCheckoutSession(dto: CreateCheckoutDto): Promise<SessionResponse> {
    const config = this.stripeService.pluginConfig

    const session = await this.stripeService.client.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: dto.priceId,
          quantity: 1,
        },
      ],
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      currency: config.currency ?? 'usd',
      metadata: dto.metadata,
      client_reference_id: dto.userId,
    })

    return {
      sessionId: session.id,
      url: session.url ?? '',
    }
  }
}
