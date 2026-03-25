import type { BaseSchema, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'

import { PolarBenefitGrant } from '../schemas/benefit-grant.schema'
import { PolarBenefit } from '../schemas/benefit.schema'

@Injectable()
export class PolarBenefitService {
  constructor(
    @InjectModel(PolarBenefit)
    private readonly benefitModel: Model<PolarBenefit>,
    @InjectModel(PolarBenefitGrant)
    private readonly benefitGrantModel: Model<PolarBenefitGrant>,
  ) {}

  /**
   * Upsert a benefit from a webhook benefit payload.
   */
  async syncBenefit(data: {
    id: string
    type: string
    description: string
    organizationId: string
    selectable: boolean
    deletable: boolean
  }): Promise<BaseSchema<PolarBenefit>> {
    const benefitData: Partial<PolarBenefit> = {
      polarBenefitId: data.id,
      type: data.type,
      description: data.description,
      organizationId: data.organizationId,
      selectable: data.selectable,
      deletable: data.deletable,
    }

    const existing = await this.benefitModel.findOne({
      polarBenefitId: data.id,
    } as Partial<BaseSchema<PolarBenefit>>)

    if (existing) {
      return this.benefitModel.update(
        { polarBenefitId: data.id } as Partial<BaseSchema<PolarBenefit>>,
        benefitData as Partial<BaseSchema<PolarBenefit>>,
      )
    }

    return this.benefitModel.create(benefitData as Partial<BaseSchema<PolarBenefit>>)
  }

  /**
   * Upsert a benefit grant from a webhook payload.
   * Handles created, updated, and revoked states.
   */
  async syncBenefitGrant(data: {
    id: string
    benefitId: string
    customerId: string
    subscriptionId?: string
    isGranted: boolean
    isRevoked: boolean
    grantedAt?: Date
    revokedAt?: Date
  }): Promise<BaseSchema<PolarBenefitGrant>> {
    const grantData: Partial<PolarBenefitGrant> = {
      polarBenefitGrantId: data.id,
      benefitId: data.benefitId,
      customerId: data.customerId,
      subscriptionId: data.subscriptionId,
      isGranted: data.isGranted,
      isRevoked: data.isRevoked,
      grantedAt: data.grantedAt,
      revokedAt: data.revokedAt,
    }

    const existing = await this.benefitGrantModel.findOne({
      polarBenefitGrantId: data.id,
    } as Partial<BaseSchema<PolarBenefitGrant>>)

    if (existing) {
      return this.benefitGrantModel.update(
        { polarBenefitGrantId: data.id } as Partial<BaseSchema<PolarBenefitGrant>>,
        grantData as Partial<BaseSchema<PolarBenefitGrant>>,
      )
    }

    return this.benefitGrantModel.create(grantData as Partial<BaseSchema<PolarBenefitGrant>>)
  }

  /**
   * Find active benefit grants for a customer.
   */
  async findGrantsByCustomerId(customerId: string): Promise<BaseSchema<PolarBenefitGrant>[]> {
    return this.benefitGrantModel.findMany({
      customerId,
      isGranted: true,
      isRevoked: false,
    } as Partial<BaseSchema<PolarBenefitGrant>>)
  }

  /**
   * List all benefits.
   */
  async findAll(): Promise<BaseSchema<PolarBenefit>[]> {
    return this.benefitModel.find()
  }

  /**
   * List all benefit grants.
   */
  async findGrantsAll(): Promise<BaseSchema<PolarBenefitGrant>[]> {
    return this.benefitGrantModel.find()
  }
}
