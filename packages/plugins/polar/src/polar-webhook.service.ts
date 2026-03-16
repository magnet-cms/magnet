import type { Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { EmailService } from '@magnet-cms/core'
import { Injectable, Logger, Optional } from '@nestjs/common'
import type { validateEvent } from '@polar-sh/sdk/webhooks'
import { PolarProcessedEvent } from './schemas/processed-event.schema'
import { PolarBenefitService } from './services/benefit.service'
import { PolarCustomerService } from './services/customer.service'
import { PolarOrderService } from './services/order.service'
import { PolarProductService } from './services/product.service'
import { PolarSubscriptionService } from './services/subscription.service'

/** The union type returned by validateEvent */
type WebhookEvent = ReturnType<typeof validateEvent>

/**
 * Polar Webhook Service
 *
 * Processes webhook events with idempotency checks.
 * Dispatches to sync services by event type.
 */
@Injectable()
export class PolarWebhookService {
	private readonly logger = new Logger(PolarWebhookService.name)

	constructor(
		@InjectModel(PolarProcessedEvent)
		private readonly processedEventModel: Model<PolarProcessedEvent>,
		private readonly customerService: PolarCustomerService,
		private readonly productService: PolarProductService,
		private readonly subscriptionService: PolarSubscriptionService,
		private readonly orderService: PolarOrderService,
		private readonly benefitService: PolarBenefitService,
		@Optional()
		private readonly emailService?: EmailService,
	) {}

	/**
	 * Process a verified Polar event with idempotency.
	 * Returns silently if the event was already processed.
	 */
	async processEvent(event: WebhookEvent): Promise<void> {
		const eventId =
			'data' in event && event.data && 'id' in event.data
				? (event.data.id as string)
				: `${event.type}-${Date.now()}`

		const existing = await this.findProcessedEvent(eventId)
		if (existing) {
			this.logger.log(`Event ${eventId} already processed, skipping`)
			return
		}

		try {
			await this.dispatchEvent(event)
			await this.recordProcessedEvent(eventId, event.type)
		} catch (error) {
			this.logger.error(
				`Failed to process event ${eventId} (${event.type}): ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	/**
	 * Dispatch event to the appropriate handler.
	 */
	private async dispatchEvent(event: WebhookEvent): Promise<void> {
		switch (event.type) {
			case 'customer.created':
			case 'customer.updated':
				await this.customerService.upsertFromWebhook({
					id: event.data.id,
					email: event.data.email,
					name: event.data.name ?? undefined,
					externalId: event.data.externalId ?? undefined,
					metadata: event.data.metadata as Record<
						string,
						string | number | boolean
					>,
				})
				break

			case 'customer.deleted':
				await this.customerService.deleteByPolarId(event.data.id)
				break

			case 'product.created':
			case 'product.updated':
				await this.productService.syncProduct({
					id: event.data.id,
					name: event.data.name,
					description: event.data.description ?? undefined,
					isRecurring: event.data.isRecurring,
					isArchived: event.data.isArchived,
					organizationId: event.data.organizationId,
					metadata: event.data.metadata as Record<
						string,
						string | number | boolean
					>,
				})
				break

			case 'subscription.created':
			case 'subscription.updated':
			case 'subscription.active':
			case 'subscription.canceled':
			case 'subscription.uncanceled':
			case 'subscription.revoked':
			case 'subscription.past_due':
				await this.subscriptionService.syncSubscription({
					id: event.data.id,
					customerId: event.data.customerId,
					productId: event.data.productId,
					status: event.data.status,
					amount: event.data.amount,
					currency: event.data.currency,
					recurringInterval: event.data.recurringInterval,
					currentPeriodStart: event.data.currentPeriodStart,
					currentPeriodEnd: event.data.currentPeriodEnd,
					cancelAtPeriodEnd: event.data.cancelAtPeriodEnd,
					startedAt: event.data.startedAt ?? undefined,
					endedAt: event.data.endedAt ?? undefined,
				})
				break

			case 'order.created':
			case 'order.paid':
			case 'order.updated':
				await this.orderService.syncOrder({
					id: event.data.id,
					customerId: event.data.customerId,
					productId: event.data.productId ?? '',
					subscriptionId: event.data.subscriptionId ?? undefined,
					status: event.data.paid ? 'paid' : 'pending',
					totalAmount: event.data.totalAmount,
					currency: event.data.currency,
					billingReason: event.data.billingReason,
					createdAt: event.data.createdAt,
				})
				break

			case 'order.refunded':
				await this.orderService.syncOrder({
					id: event.data.id,
					customerId: event.data.customerId,
					productId: event.data.productId ?? '',
					subscriptionId: event.data.subscriptionId ?? undefined,
					status: 'refunded',
					totalAmount: event.data.totalAmount,
					currency: event.data.currency,
					billingReason: event.data.billingReason,
					createdAt: event.data.createdAt,
				})
				break

			case 'benefit.created':
			case 'benefit.updated':
				await this.benefitService.syncBenefit({
					id: event.data.id,
					type: event.data.type,
					description: event.data.description,
					organizationId: event.data.organizationId,
					selectable: event.data.selectable,
					deletable: event.data.deletable,
				})
				break

			case 'benefit_grant.created':
			case 'benefit_grant.updated':
				await this.benefitService.syncBenefitGrant({
					id: event.data.id,
					benefitId: event.data.benefitId,
					customerId: event.data.customerId,
					subscriptionId: event.data.subscriptionId ?? undefined,
					isGranted: event.data.isGranted,
					isRevoked: event.data.isRevoked,
					grantedAt: event.data.isGranted
						? (event.data.modifiedAt ?? new Date())
						: undefined,
				})
				break

			case 'benefit_grant.revoked':
				await this.benefitService.syncBenefitGrant({
					id: event.data.id,
					benefitId: event.data.benefitId,
					customerId: event.data.customerId,
					subscriptionId: event.data.subscriptionId ?? undefined,
					isGranted: false,
					isRevoked: true,
					revokedAt: event.data.modifiedAt ?? new Date(),
				})
				break

			default:
				this.logger.log(
					`Unhandled event type: ${(event as { type: string }).type}`,
				)
		}
	}

	// =========================================================================
	// Idempotency Helpers
	// =========================================================================

	private async findProcessedEvent(eventId: string): Promise<boolean> {
		const result = await this.processedEventModel.findOne({
			polarEventId: eventId,
		} as Partial<PolarProcessedEvent & { id: string }>)
		return result !== null
	}

	private async recordProcessedEvent(
		eventId: string,
		eventType: string,
	): Promise<void> {
		try {
			await this.processedEventModel.create({
				polarEventId: eventId,
				eventType,
				processedAt: new Date(),
			})
		} catch (error) {
			this.logger.warn(
				`Failed to record processed event ${eventId}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}
}
