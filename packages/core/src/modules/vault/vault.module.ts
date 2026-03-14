import type { VaultConfig } from '@magnet-cms/common'
import { DynamicModule, Module } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { DatabaseModule } from '~/modules/database'
import { SettingsModule } from '~/modules/settings'
import { VaultSecret } from './schemas/vault-secret.schema'
import { VaultAdapterFactory } from './vault-adapter.factory'
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
	 * Register the vault module with configuration.
	 *
	 * The DB adapter is used by default and requires VAULT_MASTER_KEY env var.
	 * External adapters (hashicorp, supabase) are loaded dynamically.
	 *
	 * @example
	 * // In MagnetModule — done automatically via MagnetModuleOptions.vault
	 * VaultModule.forRoot({ adapter: 'db' })
	 * VaultModule.forRoot({ adapter: 'hashicorp', hashicorp: { url: '...' } })
	 */
	static forRoot(config?: VaultConfig): DynamicModule {
		const moduleConfig: VaultModuleConfig = {
			adapter: config?.adapter ?? 'db',
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
					useFactory: (moduleRef: ModuleRef) =>
						VaultAdapterFactory.getAdapter(config, moduleRef),
					inject: [ModuleRef],
				},
				VaultService,
			],
			exports: [VaultService, VAULT_ADAPTER],
		}
	}
}

export { VaultSecret } from './schemas/vault-secret.schema'
export { VaultAdapterFactory } from './vault-adapter.factory'
export { VaultService } from './vault.service'
export { VAULT_ADAPTER, VAULT_CONFIG } from './vault.constants'
