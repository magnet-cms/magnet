import { Module } from '@nestjs/common'
import { VaultController } from './vault.controller'
import { VaultService } from './vault.service'

/**
 * NestJS module for the Vault plugin backend.
 *
 * Provides VaultService for runtime secret resolution and
 * VaultController for admin API endpoints.
 * Configuration is injected via the VAULT_PLUGIN_OPTIONS provider
 * set up by PluginModule when the VaultPlugin is registered.
 */
@Module({
	controllers: [VaultController],
	providers: [VaultService],
	exports: [VaultService],
})
export class VaultModule {}
