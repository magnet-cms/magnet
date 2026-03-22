import type {
	EnvVarRequirement,
	SupabaseVaultConfig,
	VaultAdapter,
	VaultMagnetProvider,
	VaultSecretMeta,
} from '@magnet-cms/common'
import { Pool } from 'pg'

/**
 * Supabase Vault adapter for Magnet CMS.
 *
 * Uses a direct PostgreSQL connection to access the Supabase Vault extension,
 * bypassing PostgREST entirely. This means no schema exposure configuration
 * is needed (`PGRST_DB_SCHEMAS` does not need to include `vault`).
 *
 * **Prerequisites:**
 *   - Supabase project with the Vault extension enabled (pgsodium + supabase_vault)
 *   - PostgreSQL connection string (e.g. from `DATABASE_URL` env var)
 *
 * @example
 * ```typescript
 * MagnetModule.forRoot([
 *   SupabaseVaultAdapter.forRoot(),
 *   // or with explicit config:
 *   SupabaseVaultAdapter.forRoot({
 *     connectionString: 'postgresql://postgres:password@db.xxx.supabase.co:5432/postgres',
 *   }),
 * ])
 * ```
 */
export class SupabaseVaultAdapter implements VaultAdapter {
	private readonly pool: Pool

	/** Environment variables used by this adapter */
	static readonly envVars: EnvVarRequirement[] = [
		{
			name: 'DATABASE_URL',
			required: true,
			description: 'PostgreSQL connection string for the Supabase database',
		},
	]

	static forRoot(config?: Partial<SupabaseVaultConfig>): VaultMagnetProvider {
		const resolvedConfig: SupabaseVaultConfig = {
			connectionString:
				config?.connectionString ?? process.env.DATABASE_URL ?? '',
		}

		return {
			type: 'vault',
			adapter: new SupabaseVaultAdapter(resolvedConfig),
			adapterType: 'supabase',
			envVars: SupabaseVaultAdapter.envVars,
		}
	}

	constructor(config: SupabaseVaultConfig) {
		this.pool = new Pool({
			connectionString: config.connectionString,
			max: 3,
			idleTimeoutMillis: 30000,
		})
	}

	async get(key: string): Promise<string | null> {
		const client = await this.pool.connect()
		try {
			const result = await client.query<{ decrypted_secret: string | null }>(
				'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $1',
				[key],
			)
			return result.rows[0]?.decrypted_secret ?? null
		} catch (err) {
			throw new Error(
				`Supabase Vault get failed: ${err instanceof Error ? err.message : String(err)}`,
			)
		} finally {
			client.release()
		}
	}

	async set(key: string, value: string, description?: string): Promise<void> {
		const client = await this.pool.connect()
		try {
			const existing = await client.query<{ id: string }>(
				'SELECT id FROM vault.decrypted_secrets WHERE name = $1',
				[key],
			)
			if (existing.rows[0]?.id) {
				await client.query('SELECT vault.update_secret($1, $2, $3, $4)', [
					existing.rows[0].id,
					value,
					key,
					description ?? null,
				])
			} else {
				await client.query('SELECT vault.create_secret($1, $2, $3)', [
					value,
					key,
					description ?? null,
				])
			}
		} catch (err) {
			throw new Error(
				`Supabase Vault set failed: ${err instanceof Error ? err.message : String(err)}`,
			)
		} finally {
			client.release()
		}
	}

	async delete(key: string): Promise<void> {
		const client = await this.pool.connect()
		try {
			const existing = await client.query<{ id: string }>(
				'SELECT id FROM vault.decrypted_secrets WHERE name = $1',
				[key],
			)
			if (existing.rows[0]?.id) {
				await client.query('DELETE FROM vault.secrets WHERE id = $1', [
					existing.rows[0].id,
				])
			}
		} catch (err) {
			throw new Error(
				`Supabase Vault delete failed: ${err instanceof Error ? err.message : String(err)}`,
			)
		} finally {
			client.release()
		}
	}

	async list(prefix?: string): Promise<VaultSecretMeta[]> {
		const client = await this.pool.connect()
		try {
			const result = await client.query<{
				name: string
				description: string | null
				updated_at: string | null
			}>(
				prefix
					? 'SELECT name, description, updated_at FROM vault.secrets WHERE name LIKE $1 ORDER BY name'
					: 'SELECT name, description, updated_at FROM vault.secrets ORDER BY name',
				prefix ? [`${prefix}%`] : [],
			)
			return result.rows.map((row) => ({
				name: row.name,
				description: row.description ?? undefined,
				lastUpdated: row.updated_at ?? undefined,
			}))
		} catch (err) {
			throw new Error(
				`Supabase Vault list failed: ${err instanceof Error ? err.message : String(err)}`,
			)
		} finally {
			client.release()
		}
	}

	async healthCheck(): Promise<boolean> {
		const client = await this.pool.connect()
		try {
			await client.query('SELECT name FROM vault.decrypted_secrets LIMIT 1')
			return true
		} catch {
			return false
		} finally {
			client.release()
		}
	}
}
