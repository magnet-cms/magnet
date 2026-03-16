import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { StripeService } from '../stripe.service'
import type { CreatePortalDto, SessionResponse } from '../types'
import { StripeCustomerService } from './customer.service'

@Injectable()
export class StripePortalService {
	constructor(
		private readonly stripeService: StripeService,
		private readonly customerService: StripeCustomerService,
	) {}

	/**
	 * Create a Stripe Customer Portal session.
	 */
	async createPortalSession(dto: CreatePortalDto): Promise<SessionResponse> {
		let customerId = dto.customerId

		// Look up customer by userId if customerId not provided
		if (!customerId && dto.userId) {
			const customer = await this.customerService.findByUserId(dto.userId)
			if (!customer) {
				throw new HttpException(
					'No Stripe customer found for this user',
					HttpStatus.NOT_FOUND,
				)
			}
			customerId = customer.stripeCustomerId
		}

		if (!customerId) {
			throw new HttpException(
				'Either customerId or userId must be provided',
				HttpStatus.BAD_REQUEST,
			)
		}

		const session =
			await this.stripeService.client.billingPortal.sessions.create({
				customer: customerId,
				return_url: dto.returnUrl,
			})

		return {
			sessionId: session.id,
			url: session.url,
		}
	}
}
