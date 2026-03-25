import type { BaseSchema, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'

import { PolarCustomer } from '../schemas/customer.schema'

@Injectable()
export class PolarCustomerService {
  constructor(
    @InjectModel(PolarCustomer)
    private readonly customerModel: Model<PolarCustomer>,
  ) {}

  /**
   * Upsert a Polar customer record from a webhook customer payload.
   */
  async upsertFromWebhook(data: {
    id: string
    email: string
    name?: string | null
    externalId?: string | null
    metadata?: Record<string, string | number | boolean>
  }): Promise<BaseSchema<PolarCustomer>> {
    const customerData: Partial<PolarCustomer> = {
      polarCustomerId: data.id,
      email: data.email,
      name: data.name ?? undefined,
      userId: data.externalId ?? undefined,
      metadata: data.metadata,
    }

    const existing = await this.customerModel.findOne({
      polarCustomerId: data.id,
    } as Partial<BaseSchema<PolarCustomer>>)

    if (existing) {
      return this.customerModel.update(
        { polarCustomerId: data.id } as Partial<BaseSchema<PolarCustomer>>,
        customerData as Partial<BaseSchema<PolarCustomer>>,
      )
    }

    return this.customerModel.create(customerData as Partial<BaseSchema<PolarCustomer>>)
  }

  /**
   * Delete a customer record by Polar Customer ID.
   */
  async deleteByPolarId(polarCustomerId: string): Promise<void> {
    await this.customerModel.delete({
      polarCustomerId,
    } as Partial<BaseSchema<PolarCustomer>>)
  }

  /**
   * Find a customer by Magnet user ID.
   */
  async findByUserId(userId: string): Promise<BaseSchema<PolarCustomer> | null> {
    return this.customerModel.findOne({
      userId,
    } as Partial<BaseSchema<PolarCustomer>>)
  }

  /**
   * Find a customer by Polar Customer ID.
   */
  async findByPolarId(polarCustomerId: string): Promise<BaseSchema<PolarCustomer> | null> {
    return this.customerModel.findOne({
      polarCustomerId,
    } as Partial<BaseSchema<PolarCustomer>>)
  }

  /**
   * List all customers.
   */
  async findAll(): Promise<BaseSchema<PolarCustomer>[]> {
    return this.customerModel.find()
  }

  /**
   * Link a Polar customer to a Magnet user.
   */
  async linkToUser(polarCustomerId: string, userId: string): Promise<BaseSchema<PolarCustomer>> {
    return this.customerModel.update(
      { polarCustomerId } as Partial<BaseSchema<PolarCustomer>>,
      { userId } as Partial<BaseSchema<PolarCustomer>>,
    )
  }
}
