import { Injectable } from '@nestjs/common'

import { PolarService } from '../polar.service'
import type { CreateCheckoutDto, SessionResponse } from '../types'

@Injectable()
export class PolarCheckoutService {
  constructor(private readonly polarService: PolarService) {}

  /**
   * Create a Polar Checkout session.
   */
  async createCheckoutSession(dto: CreateCheckoutDto): Promise<SessionResponse> {
    const checkout = await this.polarService.client.checkouts.create({
      products: dto.products,
      successUrl: dto.successUrl,
      returnUrl: dto.returnUrl,
      customerEmail: dto.customerEmail,
      externalCustomerId: dto.userId,
      metadata: dto.metadata,
    })

    return {
      sessionId: checkout.id,
      url: checkout.url,
    }
  }
}
