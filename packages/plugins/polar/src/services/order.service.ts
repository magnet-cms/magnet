import type { BaseSchema, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'

import { PolarOrder } from '../schemas/order.schema'

@Injectable()
export class PolarOrderService {
  constructor(
    @InjectModel(PolarOrder)
    private readonly orderModel: Model<PolarOrder>,
  ) {}

  /**
   * Upsert an order from a webhook order payload.
   */
  async syncOrder(data: {
    id: string
    customerId: string
    productId: string
    subscriptionId?: string | null
    status: string
    totalAmount: number
    currency: string
    billingReason?: string
    createdAt?: Date
  }): Promise<BaseSchema<PolarOrder>> {
    const orderData: Partial<PolarOrder> = {
      polarOrderId: data.id,
      customerId: data.customerId,
      productId: data.productId,
      subscriptionId: data.subscriptionId ?? undefined,
      status: data.status === 'paid' ? 'paid' : data.status === 'refunded' ? 'refunded' : 'pending',
      totalAmount: data.totalAmount,
      currency: data.currency,
      billingReason: data.billingReason,
      createdAt: data.createdAt ?? new Date(),
    }

    const existing = await this.orderModel.findOne({
      polarOrderId: data.id,
    } as Partial<BaseSchema<PolarOrder>>)

    if (existing) {
      return this.orderModel.update(
        { polarOrderId: data.id } as Partial<BaseSchema<PolarOrder>>,
        orderData as Partial<BaseSchema<PolarOrder>>,
      )
    }

    return this.orderModel.create(orderData as Partial<BaseSchema<PolarOrder>>)
  }

  /**
   * List all orders.
   */
  async findAll(): Promise<BaseSchema<PolarOrder>[]> {
    return this.orderModel.find()
  }

  /**
   * Find orders for a customer.
   */
  async findByCustomerId(customerId: string): Promise<BaseSchema<PolarOrder>[]> {
    return this.orderModel.findMany({
      customerId,
    } as Partial<BaseSchema<PolarOrder>>)
  }
}
