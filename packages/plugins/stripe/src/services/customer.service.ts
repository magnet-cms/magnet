import type { BaseSchema, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import type Stripe from 'stripe'

import { StripeCustomer } from '../schemas/customer.schema'

@Injectable()
export class StripeCustomerService {
  constructor(
    @InjectModel(StripeCustomer)
    private readonly customerModel: Model<StripeCustomer>,
  ) {}

  /**
   * Upsert a Stripe customer record from a Stripe Customer object.
   */
  async upsertFromStripe(stripeCustomer: Stripe.Customer): Promise<BaseSchema<StripeCustomer>> {
    const data: Partial<StripeCustomer> = {
      stripeCustomerId: stripeCustomer.id,
      email: stripeCustomer.email ?? '',
      name: stripeCustomer.name ?? undefined,
      metadata: stripeCustomer.metadata as Record<string, string>,
    }

    const existing = await this.customerModel.findOne({
      stripeCustomerId: stripeCustomer.id,
    } as Partial<BaseSchema<StripeCustomer>>)

    if (existing) {
      return this.customerModel.update(
        { stripeCustomerId: stripeCustomer.id } as Partial<BaseSchema<StripeCustomer>>,
        data as Partial<BaseSchema<StripeCustomer>>,
      )
    }

    return this.customerModel.create(data as Partial<BaseSchema<StripeCustomer>>)
  }

  /**
   * Delete a customer record by Stripe Customer ID.
   */
  async deleteByStripeId(stripeCustomerId: string): Promise<void> {
    await this.customerModel.delete({
      stripeCustomerId,
    } as Partial<BaseSchema<StripeCustomer>>)
  }

  /**
   * Find a customer by Magnet user ID.
   */
  async findByUserId(userId: string): Promise<BaseSchema<StripeCustomer> | null> {
    return this.customerModel.findOne({
      userId,
    } as Partial<BaseSchema<StripeCustomer>>)
  }

  /**
   * Find a customer by Stripe Customer ID.
   */
  async findByStripeId(stripeCustomerId: string): Promise<BaseSchema<StripeCustomer> | null> {
    return this.customerModel.findOne({
      stripeCustomerId,
    } as Partial<BaseSchema<StripeCustomer>>)
  }

  /**
   * List all customers.
   */
  async findAll(): Promise<BaseSchema<StripeCustomer>[]> {
    return this.customerModel.find()
  }

  /**
   * Link a Stripe customer to a Magnet user.
   */
  async linkToUser(stripeCustomerId: string, userId: string): Promise<BaseSchema<StripeCustomer>> {
    return this.customerModel.update(
      { stripeCustomerId } as Partial<BaseSchema<StripeCustomer>>,
      { userId } as Partial<BaseSchema<StripeCustomer>>,
    )
  }
}
