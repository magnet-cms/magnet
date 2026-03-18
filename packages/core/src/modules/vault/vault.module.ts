import type { VaultAdapter } from '@magnet-cms/common'
import { DynamicModule, Module } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { DatabaseModule } from '~/modules/database'
import { SettingsModule } from '~/modules/settings'
import { DbVaultAdapter } from './adapters/db-vault.adapter'
import { VaultSecret } from './schemas/vault-secret.schema'
import { VAULT_ADAPTER, VAULT_CONFIG } from './vault.constants'
import { VaultController } from './vault.controller'
import { VaultService } from './vault.service'
import { VaultSettings } from './vault.settings'

export interface VaultModuleConfig {
	adapter?: 'db' | 'hashicorp' | 'supabase'
	cacheTtl?: number
}

@Module({})
export class VaultModule {
	/**
	 * Register the vault module with an adapter instance or factory.
	 *
	 * @param adapter - Direct vault adapter instance (for adapters that don't need DI)
	 * @param adapterFactory - Factory function for adapters that need NestJS ModuleRef (e.g., DbVaultAdapter)
	 * @param config - Vault configuration (cacheTtl, etc.)
	 */
	static forRoot(
		adapter?: VaultAdapter | null,
		adapterFactory?: ((moduleRef: unknown) => VaultAdapter) | null,
		config?: { cacheTtl?: number } | null,
	): DynamicModule {
		const moduleConfig: VaultModuleConfig = {
			cacheTtl: config?.cacheTtl,
		}

		return {
			module: VaultModule,
			global: true,
			imports: [
				DatabaseModule.forFeature(VaultSecret),
				SettingsModule.forFeature(VaultSettings),
			],
			controllers: [VaultController],
			providers: [
				{
					provide: VAULT_CONFIG,
					useValue: moduleConfig,
				},
				{
					provide: VAULT_ADAPTER,
					useFactory: (moduleRef: ModuleRef) => {
						// Direct adapter takes priority
						if (adapter) return adapter
						// Factory function (e.g., for DbVaultAdapter that needs ModuleRef)
						if (adapterFactory) return adapterFactory(moduleRef)
						// Default: built-in DB vault adapter
						return new DbVaultAdapter(moduleRef)
					},
					inject: [ModuleRef],
				},
				VaultService,
			],
			exports: [VaultService, VAULT_ADAPTER],
		}
	}
}

export { VaultSecret } from './schemas/vault-secret.schema'
export { VaultService } from './vault.service'
export { VAULT_ADAPTER, VAULT_CONFIG } from './vault.constants'
