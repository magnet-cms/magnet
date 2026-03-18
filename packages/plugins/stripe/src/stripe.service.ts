import { InjectPluginOptions } from '@magnet-cms/core'
import {
	HttpException,
	HttpStatus,
	Injectable,
	Logger,
	type OnModuleInit,
} from '@nestjs/common'
import Stripe from 'stripe'
import type { StripePluginConfig } from './types'

/**
 * Core Stripe SDK service.
 *
 * Initializes the Stripe client from plugin options and provides
 * typed access for other services to use.
 */
@Injectable()
export class StripeService implements OnModuleInit {
	private readonly logger = new Logger(StripeService.name)
	private stripe: Stripe | null = null

	constructor(
		@InjectPluginOptions('stripe')
		private readonly config: StripePluginConfig,
	) {}

	onModuleInit(): void {
		if (!this.config.secretKey) {
			throw new Error(
				'[StripePlugin] Missing secretKey in plugin options. ' +
					'Configure it via: { plugin: StripePlugin, options: { secretKey: process.env.STRIPE_SECRET_KEY } }',
			)
		}

		this.stripe = new Stripe(this.config.secretKey, {
			apiVersion: '2025-02-24.acacia',
		})

		if (this.config.webhookSecret) {
			this.logger.debug(
				'Webhook secret configured. Ensure rawBody is enabled in NestFactory.create() for signature verification.',
			)
		}
	}

	/** Get the initialized Stripe client */
	get client(): Stripe {
		if (!this.stripe) {
			throw new Error(
				'[StripePlugin] Stripe client not initialized. Ensure the module has been initialized.',
			)
		}
		return this.stripe
	}

	/** Get the plugin configuration */
	get pluginConfig(): StripePluginConfig {
		return this.config
	}

	/**
	 * Verify that raw body is available on the request.
	 * Must be called before webhook signature verification.
	 * Consumers must enable `rawBody: true` in NestFactory.create().
	 */
	verifyRawBodyAvailable(req: { rawBody?: Buffer }): asserts req is {
		rawBody: Buffer
	} {
		if (!req.rawBody) {
			throw new HttpException(
				'[StripePlugin] Raw request body not available. ' +
					'Enable rawBody in your NestJS bootstrap: ' +
					'NestFactory.create(AppModule, { rawBody: true }). ' +
					'This is required for Stripe webhook signature verification.',
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}
	}
}
