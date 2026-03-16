import type {
	VaultAdapter,
	VaultAdapterType,
	VaultConfig,
} from '@magnet-cms/common'
import type { ModuleRef } from '@nestjs/core'
import { DbVaultAdapter } from './adapters/db-vault.adapter'

/**
 * Factory for creating vault adapters.
 *
 * The DB adapter is built-in (no install required) and is used by default.
 * HashiCorp and Supabase adapters are loaded dynamically from optional packages.
 */
export class VaultAdapterFactory {
	private static cachedAdapter: VaultAdapter | null = null
	private static cachedConfig: VaultConfig | null = null

	/**
	 * Get or create a vault adapter based on configuration.
	 * @param config - Vault configuration (optional, defaults to 'db' adapter)
	 * @param moduleRef - NestJS ModuleRef, required for the built-in DB adapter
	 */
	static getAdapter(config?: VaultConfig, moduleRef?: ModuleRef): VaultAdapter {
		if (
			VaultAdapterFactory.cachedAdapter &&
			VaultAdapterFactory.configMatches(config)
		) {
			return VaultAdapterFactory.cachedAdapter
		}

		const adapterType: VaultAdapterType =
			config?.adapter ?? VaultAdapterFactory.detectVaultAdapter()

		switch (adapterType) {
			case 'db': {
				if (!moduleRef) {
					throw new Error(
						'ModuleRef is required for the built-in DB vault adapter',
					)
				}
				VaultAdapterFactory.cachedAdapter = new DbVaultAdapter(moduleRef)
				break
			}

			case 'hashicorp': {
				let HashiCorpVaultAdapter: new (
					config?: VaultConfig['hashicorp'],
				) => VaultAdapter
				try {
					;({
						HashiCorpVaultAdapter,
					} = require('@magnet-cms/adapter-vault-hashicorp'))
				} catch {
					throw new Error(
						'HashiCorp Vault adapter not found. Install @magnet-cms/adapter-vault-hashicorp',
					)
				}
				VaultAdapterFactory.cachedAdapter = new HashiCorpVaultAdapter(
					config?.hashicorp,
				)
				break
			}

			case 'supabase': {
				if (!config?.supabase) {
					throw new Error(
						'Supabase configuration is required for the Supabase vault adapter',
					)
				}
				try {
					const {
						SupabaseVaultAdapter,
					} = require('@magnet-cms/adapter-vault-supabase')
					VaultAdapterFactory.cachedAdapter = new SupabaseVaultAdapter(
						config.supabase,
					)
				} catch {
					throw new Error(
						'Supabase Vault adapter not found. Install @magnet-cms/adapter-vault-supabase',
					)
				}
				break
			}

			default:
				if (!moduleRef) {
					throw new Error(
						'ModuleRef is required for the built-in DB vault adapter',
					)
				}
				VaultAdapterFactory.cachedAdapter = new DbVaultAdapter(moduleRef)
		}

		VaultAdapterFactory.cachedConfig = config ?? null

		if (!VaultAdapterFactory.cachedAdapter) {
			throw new Error('Failed to initialize vault adapter')
		}

		return VaultAdapterFactory.cachedAdapter
	}

	/**
	 * Clear cached adapter (useful for testing).
	 */
	static clearCache(): void {
		VaultAdapterFactory.cachedAdapter = null
		VaultAdapterFactory.cachedConfig = null
	}

	/**
	 * Detect the adapter type from environment variables.
	 */
	private static detectVaultAdapter(): VaultAdapterType {
		if (process.env.VAULT_ADDR && process.env.VAULT_TOKEN) {
			return 'hashicorp'
		}
		return 'db'
	}

	private static configMatches(config?: VaultConfig): boolean {
		if (!config && !VaultAdapterFactory.cachedConfig) {
			return true
		}
		if (!config || !VaultAdapterFactory.cachedConfig) {
			return false
		}
		return config === VaultAdapterFactory.cachedConfig
	}
}
