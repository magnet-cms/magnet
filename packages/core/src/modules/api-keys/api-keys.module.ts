import { Module } from '@nestjs/common'
import { DatabaseModule } from '~/modules/database'
import { EventsModule } from '~/modules/events'
import { SettingsModule } from '~/modules/settings'
import { ApiKeyController } from './api-keys.controller'
import { ApiKeyService } from './api-keys.service'
import { ApiKeySettings } from './api-keys.settings'
import { ApiKeyGuard } from './guards/api-key.guard'
import { ApiKeyUsage } from './schemas/api-key-usage.schema'
import { ApiKey } from './schemas/api-key.schema'

/**
 * API Keys module for programmatic access to the CMS.
 *
 * This module provides:
 * - API key generation and management
 * - Scoped permissions per key
 * - Rate limiting per key
 * - IP whitelist support
 * - Expiration support
 * - Usage tracking and analytics
 * - Key rotation
 *
 * @example
 * ```typescript
 * // In MagnetModule
 * @Module({
 *   imports: [
 *     ApiKeysModule,
 *     // ... other modules
 *   ],
 * })
 * export class MagnetModule {}
 * ```
 *
 * @example
 * ```typescript
 * // Using API key authentication in a controller
 * @Controller('api/content')
 * @UseGuards(ApiKeyGuard)
 * export class ContentApiController {
 *   @Get()
 *   @RequireApiKeyPermission('content.read')
 *   async list() { ... }
 * }
 * ```
 */
@Module({
	imports: [
		DatabaseModule.forFeature(ApiKey),
		DatabaseModule.forFeature(ApiKeyUsage),
		EventsModule,
		SettingsModule.forFeature(ApiKeySettings),
	],
	controllers: [ApiKeyController],
	providers: [ApiKeyService, ApiKeyGuard],
	exports: [ApiKeyService, ApiKeyGuard],
})
export class ApiKeysModule {}
