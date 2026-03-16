import { DatabaseModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { PolarApiController } from './polar-api.controller'
import { PolarWebhookController } from './polar-webhook.controller'
import { PolarWebhookService } from './polar-webhook.service'
import { PolarService } from './polar.service'
import { PolarBenefitGrant } from './schemas/benefit-grant.schema'
import { PolarBenefit } from './schemas/benefit.schema'
import { PolarCustomer } from './schemas/customer.schema'
import { PolarOrder } from './schemas/order.schema'
import { PolarProcessedEvent } from './schemas/processed-event.schema'
import { PolarProduct } from './schemas/product.schema'
import { PolarSubscription } from './schemas/subscription.schema'
import { PolarAccessService } from './services/access.service'
import { PolarBenefitService } from './services/benefit.service'
import { PolarCheckoutService } from './services/checkout.service'
import { PolarCustomerService } from './services/customer.service'
import { PolarMetricsService } from './services/metrics.service'
import { PolarOrderService } from './services/order.service'
import { PolarPortalService } from './services/portal.service'
import { PolarProductService } from './services/product.service'
import { PolarSubscriptionService } from './services/subscription.service'

/**
 * Polar Plugin Module
 *
 * Registers all Polar schemas, services, and controllers.
 * Auto-imported by the @Plugin decorator's `module` field.
 */
@Module({
	imports: [
		DatabaseModule.forFeature(PolarCustomer),
		DatabaseModule.forFeature(PolarProduct),
		DatabaseModule.forFeature(PolarSubscription),
		DatabaseModule.forFeature(PolarOrder),
		DatabaseModule.forFeature(PolarBenefit),
		DatabaseModule.forFeature(PolarBenefitGrant),
		DatabaseModule.forFeature(PolarProcessedEvent),
	],
	controllers: [PolarApiController, PolarWebhookController],
	providers: [
		PolarService,
		PolarWebhookService,
		PolarCustomerService,
		PolarProductService,
		PolarSubscriptionService,
		PolarOrderService,
		PolarBenefitService,
		PolarCheckoutService,
		PolarPortalService,
		PolarAccessService,
		PolarMetricsService,
	],
	exports: [
		PolarService,
		PolarCustomerService,
		PolarProductService,
		PolarSubscriptionService,
		PolarOrderService,
		PolarBenefitService,
		PolarCheckoutService,
		PolarPortalService,
		PolarAccessService,
	],
})
export class PolarModule {}
