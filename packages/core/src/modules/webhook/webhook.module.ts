import { type DynamicModule, Module } from '@nestjs/common'
import { DatabaseModule } from '~/modules/database'
import { SettingsModule } from '~/modules/settings'
import { WebhookDelivery } from './schemas/webhook-delivery.schema'
import { Webhook } from './schemas/webhook.schema'
import { WebhookController } from './webhook.controller'
import { WebhookListenerService } from './webhook.listener'
import { WebhookService } from './webhook.service'
import { WebhookSettings } from './webhook.settings'

/**
 * Webhook Module
 *
 * Provides outgoing webhook management: CRUD for webhook configs,
 * event-driven HTTP dispatch with HMAC signing and retry,
 * and delivery logging.
 *
 * @example
 * ```typescript
 * // Automatically included in MagnetModule.forRoot()
 * // No configuration needed — webhooks are managed via the Admin UI or API.
 * ```
 */
@Module({})
export class WebhookModule {
	static forRoot(): DynamicModule {
		return {
			module: WebhookModule,
			imports: [
				DatabaseModule.forFeature(Webhook),
				DatabaseModule.forFeature(WebhookDelivery),
				SettingsModule.forFeature(WebhookSettings),
			],
			controllers: [WebhookController],
			providers: [WebhookService, WebhookListenerService],
			exports: [WebhookService],
		}
	}
}
