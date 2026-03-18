import type {
	EnvVarRequirement,
	SupabaseVaultConfig,
	VaultAdapter,
	VaultMagnetProvider,
	VaultSecretMeta,
} from '@magnet-cms/common'
import { type SupabaseClient, createClient } from '@supabase/supabase-js'

interface DecryptedSecretRow {
	name: string
	decrypted_secret: string
}

interface SecretRow {
	name: string
	description: string | null
	updated_at?: string | null
}

/**
 * Supabase Vault adapter for Magnet CMS.
 *
 * Uses Supabase's native Vault extension (pgsodium) via SQL RPC functions.
 * Secrets are encrypted at rest using Supabase's built-in key management.
 *
 * Prerequisites:
 *   - Supabase project with the Vault extension enabled
 *   - Service role key (required for vault operations)
 *   - PostgREST must expose the `vault` schema (PGRST_DB_SCHEMAS includes `vault`)
 *
 * @example
 * ```typescript
 * MagnetModule.forRoot({
 *   vault: {
 *     adapter: 'supabase',
 *     supabase: {
 *       supabaseUrl: 'https://xxx.supabase.co',
 *       supabaseServiceKey: 'service-role-key',
 *     },
 *   },
 * })
 * ```
 */
export class SupabaseVaultAdapter implements VaultAdapter {
	private readonly client: SupabaseClient

	/** Environment variables used by this adapter */
	static readonly envVars: EnvVarRequirement[] = [
		{
			name: 'SUPABASE_URL',
			required: true,
			description: 'Supabase project URL',
		},
		{
			name: 'SUPABASE_SERVICE_KEY',
			required: true,
			description: 'Supabase service role key',
		},
	]

	/**
	 * Create a configured vault provider for MagnetModule.forRoot().
	 * Auto-resolves config values from environment variables if not provided.
	 *
	 * @example
	 * ```typescript
	 * MagnetModule.forRoot([
	 *   SupabaseVaultAdapter.forRoot(),
	 *   // or with explicit config:
	 *   SupabaseVaultAdapter.forRoot({
	 *     supabaseUrl: 'https://xxx.supabase.co',
	 *     supabaseServiceKey: 'service-role-key',
	 *   }),
	 * ])
	 * ```
	 */
	static forRoot(config?: Partial<SupabaseVaultConfig>): VaultMagnetProvider {
		const resolvedConfig: SupabaseVaultConfig = {
			supabaseUrl: config?.supabaseUrl ?? process.env.SUPABASE_URL ?? '',
			supabaseServiceKey:
				config?.supabaseServiceKey ?? process.env.SUPABASE_SERVICE_KEY ?? '',
		}

		return {
			type: 'vault',
			adapter: new SupabaseVaultAdapter(resolvedConfig),
			envVars: SupabaseVaultAdapter.envVars,
		}
	}

	constructor(config: SupabaseVaultConfig) {
		this.client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
			auth: { persistSession: false },
		})
	}

	/** Query builder scoped to the vault schema (sets Accept-Profile header for PostgREST). */
	private vault() {
		return this.client.schema('vault')
	}

	async get(key: string): Promise<string | null> {
		const { data, error } = await this.vault()
			.from('decrypted_secrets')
			.select('name, decrypted_secret')
			.eq('name', key)
			.maybeSingle<DecryptedSecretRow>()

		if (error) {
			throw new Error(`Supabase Vault get failed: ${error.message}`)
		}
		if (!data) {
			return null
		}

		return data.decrypted_secret
	}

	async set(key: string, value: string, description?: string): Promise<void> {
		// Check if secret already exists
		const { data: existing } = await this.vault()
			.from('decrypted_secrets')
			.select('id')
			.eq('name', key)
			.maybeSingle<{ id: string }>()

		if (existing?.id) {
			const { error } = await this.vault().rpc('update_secret', {
				secret_id: existing.id,
				new_secret: value,
				new_name: key,
				new_description: description ?? null,
			})
			if (error) {
				throw new Error(`Supabase Vault update failed: ${error.message}`)
			}
		} else {
			const { error } = await this.vault().rpc('create_secret', {
				new_secret: value,
				new_name: key,
				new_description: description ?? null,
			})
			if (error) {
				throw new Error(`Supabase Vault create failed: ${error.message}`)
			}
		}
	}

	async delete(key: string): Promise<void> {
		const { data: existing } = await this.vault()
			.from('decrypted_secrets')
			.select('id')
			.eq('name', key)
			.maybeSingle<{ id: string }>()

		if (!existing?.id) {
			return
		}

		const { error } = await this.vault()
			.from('secrets')
			.delete()
			.eq('id', existing.id)

		if (error) {
			throw new Error(`Supabase Vault delete failed: ${error.message}`)
		}
	}

	async list(prefix?: string): Promise<VaultSecretMeta[]> {
		let query = this.vault()
			.from('secrets')
			.select('name, description, updated_at')

		if (prefix) {
			query = query.like('name', `${prefix}%`)
		}

		const { data, error } = await query.returns<SecretRow[]>()

		if (error) {
			throw new Error(`Supabase Vault list failed: ${error.message}`)
		}

		return (data ?? []).map((row) => ({
			name: row.name,
			description: row.description ?? undefined,
			lastUpdated: row.updated_at ?? undefined,
		}))
	}

	async healthCheck(): Promise<boolean> {
		try {
			const { error } = await this.vault()
				.from('decrypted_secrets')
				.select('name')
				.limit(1)

			return !error
		} catch {
			return false
		}
	}
}
