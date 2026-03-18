import { InjectPluginOptions } from '@magnet-cms/core'
import {
	HttpException,
	HttpStatus,
	Injectable,
	Logger,
	type OnModuleInit,
} from '@nestjs/common'
import { Polar } from '@polar-sh/sdk'
import type { PolarPluginConfig } from './types'

/**
 * Core Polar SDK service.
 *
 * Initializes the Polar client from plugin options and provides
 * typed access for other services to use.
 */
@Injectable()
export class PolarService implements OnModuleInit {
	private readonly logger = new Logger(PolarService.name)
	private polar: Polar | null = null

	constructor(
		@InjectPluginOptions('polar')
		private readonly config: PolarPluginConfig,
	) {}

	onModuleInit(): void {
		if (!this.config.accessToken) {
			throw new Error(
				'[PolarPlugin] Missing accessToken in plugin options. ' +
					'Configure it via: { plugin: PolarPlugin, options: { accessToken: process.env.POLAR_ACCESS_TOKEN } }',
			)
		}

		this.polar = new Polar({
			accessToken: this.config.accessToken,
		})

		if (this.config.webhookSecret) {
			this.logger.debug(
				'Webhook secret configured. Ensure rawBody is enabled in NestFactory.create() for signature verification.',
			)
		}
	}

	/** Get the initialized Polar client */
	get client(): Polar {
		if (!this.polar) {
			throw new Error(
				'[PolarPlugin] Polar client not initialized. Ensure the module has been initialized.',
			)
		}
		return this.polar
	}

	/** Get the plugin configuration */
	get pluginConfig(): PolarPluginConfig {
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
				'[PolarPlugin] Raw request body not available. ' +
					'Enable rawBody in your NestJS bootstrap: ' +
					'NestFactory.create(AppModule, { rawBody: true }). ' +
					'This is required for Polar webhook signature verification.',
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}
	}
}
