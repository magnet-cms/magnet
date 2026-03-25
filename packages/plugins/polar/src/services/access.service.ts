import type { BaseSchema, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'

import { PolarService } from '../polar.service'
import { PolarProduct } from '../schemas/product.schema'
import type { SubscriptionAccessResponse } from '../types'

import { PolarCustomerService } from './customer.service'
import { PolarSubscriptionService } from './subscription.service'

@Injectable()
export class PolarAccessService {
  constructor(
    private readonly polarService: PolarService,
    private readonly customerService: PolarCustomerService,
    private readonly subscriptionService: PolarSubscriptionService,
    @InjectModel(PolarProduct)
    private readonly productModel: Model<PolarProduct>,
  ) {}

  /**
   * Get subscription access info for a user.
   * Returns subscription status, plan name, and feature flags.
   */
  async getAccess(userId: string): Promise<SubscriptionAccessResponse> {
    const noAccess: SubscriptionAccessResponse = {
      hasActiveSubscription: false,
      plan: null,
      expiresAt: null,
      features: [],
    }

    // Find customer by user ID
    const customer = await this.customerService.findByUserId(userId)
    if (!customer) {
      return noAccess
    }

    // Find active subscription
    const subscription = await this.subscriptionService.findActiveByCustomerId(
      customer.polarCustomerId,
    )
    if (!subscription) {
      return noAccess
    }

    // Resolve product → plan name
    let planName: string | null = null
    const product = await this.productModel.findOne({
      polarProductId: subscription.productId,
    } as Partial<BaseSchema<PolarProduct>>)
    planName = product?.name ?? null

    // Resolve feature flags from config
    const features = this.resolveFeaturesForPlan(planName)

    return {
      hasActiveSubscription: true,
      plan: planName,
      expiresAt: subscription.currentPeriodEnd,
      features,
    }
  }

  /**
   * Resolve feature flags for a plan name from plugin config.
   */
  private resolveFeaturesForPlan(planName: string | null): string[] {
    if (!planName) return []

    const featuresConfig = this.polarService.pluginConfig.features
    if (!featuresConfig) return []

    // Try exact match first, then case-insensitive
    const normalizedPlan = planName.toLowerCase()
    for (const [key, features] of Object.entries(featuresConfig)) {
      if (key.toLowerCase() === normalizedPlan) {
        return features
      }
    }

    return []
  }
}
