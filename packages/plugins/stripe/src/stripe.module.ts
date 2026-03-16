import { DatabaseModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { StripeCustomer } from './schemas/customer.schema'
import { StripePayment } from './schemas/payment.schema'
import { StripePrice } from './schemas/price.schema'
import { StripeProcessedEvent } from './schemas/processed-event.schema'
import { StripeProduct } from './schemas/product.schema'
import { StripeSubscription } from './schemas/subscription.schema'
import { StripeAccessService } from './services/access.service'
import { StripeCheckoutService } from './services/checkout.service'
import { StripeCustomerService } from './services/customer.service'
import { StripeMetricsService } from './services/metrics.service'
import { StripePortalService } from './services/portal.service'
import { StripeProductService } from './services/product.service'
import { StripeSubscriptionService } from './services/subscription.service'
import { StripeApiController } from './stripe-api.controller'
import { StripeWebhookController } from './stripe-webhook.controller'
import { StripeWebhookService } from './stripe-webhook.service'
import { StripeService } from './stripe.service'

/**
 * Stripe Plugin Module
 *
 * Registers all Stripe schemas, services, and controllers.
 * Auto-imported by the @Plugin decorator's `module` field.
 */
@Module({
	imports: [
		DatabaseModule.forFeature(StripeCustomer),
		DatabaseModule.forFeature(StripeProduct),
		DatabaseModule.forFeature(StripePrice),
		DatabaseModule.forFeature(StripeSubscription),
		DatabaseModule.forFeature(StripePayment),
		DatabaseModule.forFeature(StripeProcessedEvent),
	],
	controllers: [StripeApiController, StripeWebhookController],
	providers: [
		StripeService,
		StripeWebhookService,
		StripeCustomerService,
		StripeProductService,
		StripeSubscriptionService,
		StripeCheckoutService,
		StripePortalService,
		StripeAccessService,
		StripeMetricsService,
	],
	exports: [
		StripeService,
		StripeCustomerService,
		StripeProductService,
		StripeSubscriptionService,
		StripeCheckoutService,
		StripePortalService,
		StripeAccessService,
	],
})
export class StripeModule {}
