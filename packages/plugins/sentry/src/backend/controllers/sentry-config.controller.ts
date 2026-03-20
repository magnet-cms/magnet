import { RestrictedRoute } from '@magnet-cms/core'
import { Controller, Get, Inject } from '@nestjs/common'
import { SENTRY_OPTIONS } from '../constants'
import type { SentryClientConfig, SentryPluginConfig } from '../types'

/**
 * Exposes Sentry configuration for the frontend admin UI.
 *
 * The DSN is not a secret by design — Sentry intends it to be embedded
 * in client-side bundles. We still restrict this endpoint to authenticated
 * admin users as a best practice to limit unnecessary exposure.
 */
@Controller('sentry')
export class SentryConfigController {
	constructor(
		@Inject(SENTRY_OPTIONS) private readonly options: SentryPluginConfig,
	) {}

	/**
	 * Return the public Sentry config needed to initialize the Browser SDK
	 * in the admin UI feedback widget.
	 *
	 * Requires authentication — uses the standard Magnet admin guard.
	 */
	@Get('config')
	@RestrictedRoute()
	getConfig(): SentryClientConfig {
		return {
			dsn: this.options.dsn ?? '',
			enabled: this.options.enabled ?? true,
			environment:
				this.options.environment ?? process.env.NODE_ENV ?? 'production',
		}
	}
}
