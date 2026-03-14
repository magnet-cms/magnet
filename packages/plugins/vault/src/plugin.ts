import type { PluginLifecycle } from '@magnet-cms/common'
import { Plugin } from '@magnet-cms/core'
import { Logger } from '@nestjs/common'
import { VaultModule } from './backend/vault.module'

const logger = new Logger('VaultPlugin')

/**
 * Vault Plugin
 *
 * Provides HashiCorp Vault integration for secrets management.
 * Supports both remote Vault servers and local development with env fallback.
 *
 * Features:
 * - Boot-time secret resolution via VaultBootstrap.resolve()
 * - Runtime secret resolution via VaultService with caching
 * - Convention-based path mapping with explicit overrides
 * - Admin UI for connection config, secret browsing, and mapping management
 *
 * @example
 * ```typescript
 * import { VaultPlugin } from '@magnet-cms/plugin-vault'
 *
 * MagnetModule.forRoot({
 *   plugins: [{ plugin: VaultPlugin }],
 * })
 * ```
 */
@Plugin({
	name: 'vault',
	description: 'Secrets management via HashiCorp Vault',
	version: '0.1.0',
	module: VaultModule,
	frontend: {
		routes: [
			{
				path: 'vault',
				componentId: 'VaultSettings',
				children: [{ path: '', componentId: 'VaultSettings' }],
			},
		],
		sidebar: [
			{
				id: 'vault',
				title: 'Vault',
				url: '/vault',
				icon: 'KeyRound',
				order: 90,
			},
		],
	},
})
export class VaultPlugin implements PluginLifecycle {
	async onPluginInit(): Promise<void> {
		logger.log('Vault plugin initialized')
	}

	async onPluginDestroy(): Promise<void> {
		// VaultService.onModuleDestroy() is called automatically by NestJS DI
		logger.log('Vault plugin destroyed')
	}
}
