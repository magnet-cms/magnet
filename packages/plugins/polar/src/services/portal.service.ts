import { HttpException, HttpStatus, Injectable } from '@nestjs/common'

import { PolarService } from '../polar.service'
import type { CreatePortalDto, SessionResponse } from '../types'

import { PolarCustomerService } from './customer.service'

@Injectable()
export class PolarPortalService {
  constructor(
    private readonly polarService: PolarService,
    private readonly customerService: PolarCustomerService,
  ) {}

  /**
   * Create a Polar Customer Portal session.
   */
  async createPortalSession(dto: CreatePortalDto): Promise<SessionResponse> {
    let customerId = dto.customerId

    // Look up customer by userId if customerId not provided
    if (!customerId && dto.userId) {
      const customer = await this.customerService.findByUserId(dto.userId)
      if (!customer) {
        throw new HttpException('No Polar customer found for this user', HttpStatus.NOT_FOUND)
      }
      customerId = customer.polarCustomerId
    }

    if (!customerId) {
      throw new HttpException(
        'Either customerId or userId must be provided',
        HttpStatus.BAD_REQUEST,
      )
    }

    const session = await this.polarService.client.customerSessions.create({
      customerId,
      returnUrl: dto.returnUrl,
    })

    return {
      sessionId: session.id,
      url: session.customerPortalUrl,
    }
  }
}
