import {
	Inject,
	Injectable,
	Logger,
	OnModuleDestroy,
	Optional,
} from '@nestjs/common'
import type {
	CachedSecret,
	VaultClientInterface,
	VaultPluginOptions,
	VaultSecretMapping,
} from './types'
import { createVaultClient } from './vault.client'

const DEFAULT_CACHE_TTL = 300 // 5 minutes in seconds

/**
 * Runtime secret resolution service with caching and rotation support.
 *
 * Provides `get()` and `getMany()` for on-demand secret reading,
 * and `watch()` for periodic refresh of rotatable secrets.
 *
 * When no Vault is configured, all methods gracefully return undefined
 * with a warning log (same pattern as EmailService).
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   constructor(private readonly vault: VaultService) {}
 *
 *   async getApiKey(): Promise<string | undefined> {
 *     const secret = await this.vault.get<{ apiKey: string }>('myapp/api-keys')
 *     return secret?.apiKey
 *   }
 * }
 * ```
 */
@Injectable()
export class VaultService implements OnModuleDestroy {
	private readonly logger = new Logger(VaultService.name)
	private readonly client: VaultClientInterface
	private readonly cache = new Map<string, CachedSecret>()
	private readonly watchers = new Map<string, ReturnType<typeof setInterval>>()
	private readonly cacheTtl: number
	private mappings: VaultSecretMapping[]
	private hasWarnedNotConfigured = false

	constructor(
		@Optional()
		@Inject('VAULT_PLUGIN_OPTIONS')
		options?: VaultPluginOptions,
	) {
		this.client = createVaultClient(options?.config)
		this.cacheTtl = options?.cacheTtl ?? DEFAULT_CACHE_TTL
		this.mappings = options?.mappings ?? []
	}

	/**
	 * Read a secret at the given path.
	 *
	 * @param path - Vault secret path (e.g., 'magnet/database')
	 * @returns Secret data cast to T, or undefined if not found or Vault not configured
	 */
	async get<T = Record<string, unknown>>(path: string): Promise<T | undefined> {
		if (!this.client.isConfigured()) {
			this.warnNotConfigured()
			return undefined
		}

		// Check cache first
		const cached = this.cache.get(path)
		if (cached && cached.expiresAt > Date.now()) {
			return cached.data as T
		}

		try {
			const secret = await this.client.read(path)
			if (!secret) {
				return undefined
			}

			// Update cache
			this.cache.set(path, {
				data: secret.data,
				expiresAt: Date.now() + this.cacheTtl * 1000,
			})

			return secret.data as T
		} catch (error) {
			this.logger.error(
				`Failed to read secret at ${path}: ${error instanceof Error ? error.message : String(error)}`,
			)
			return undefined
		}
	}

	/**
	 * Read multiple secrets at the given paths.
	 *
	 * @param paths - Array of Vault secret paths
	 * @returns Array of secret data (undefined for paths that failed)
	 */
	async getMany(
		paths: string[],
	): Promise<Array<Record<string, unknown> | undefined>> {
		const results = await Promise.allSettled(
			paths.map((path) => this.get(path)),
		)

		return results.map((result) =>
			result.status === 'fulfilled' ? result.value : undefined,
		)
	}

	/**
	 * Force refresh a cached secret.
	 *
	 * @param path - Vault secret path to refresh
	 */
	async refresh(path: string): Promise<void> {
		this.cache.delete(path)
		await this.get(path)
	}

	/**
	 * Start watching a secret for rotation.
	 * Periodically refreshes the cached value at the given interval.
	 *
	 * @param path - Vault secret path to watch
	 * @param intervalMs - Refresh interval in milliseconds (default: cacheTtl * 1000)
	 */
	watch(path: string, intervalMs?: number): void {
		if (this.watchers.has(path)) {
			return // Already watching
		}

		const interval = intervalMs ?? this.cacheTtl * 1000

		const timer = setInterval(async () => {
			try {
				await this.refresh(path)
				this.logger.debug(`Refreshed watched secret: ${path}`)
			} catch (error) {
				this.logger.error(
					`Failed to refresh watched secret ${path}: ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}, interval)

		this.watchers.set(path, timer)
		this.logger.log(`Watching secret ${path} (refresh every ${interval}ms)`)
	}

	/**
	 * Stop watching a secret.
	 */
	unwatch(path: string): void {
		const timer = this.watchers.get(path)
		if (timer) {
			clearInterval(timer)
			this.watchers.delete(path)
			this.logger.log(`Stopped watching secret: ${path}`)
		}
	}

	/**
	 * Stop all watchers and clear cache on module destroy.
	 */
	onModuleDestroy(): void {
		for (const [path, timer] of this.watchers) {
			clearInterval(timer)
			this.logger.debug(`Stopped watcher for ${path}`)
		}
		this.watchers.clear()
		this.cache.clear()
	}

	/**
	 * Check if the Vault client is connected to a real Vault server.
	 */
	isConfigured(): boolean {
		return this.client.isConfigured()
	}

	/**
	 * Get configured secret mappings.
	 */
	getMappings(): VaultSecretMapping[] {
		return [...this.mappings]
	}

	/**
	 * Update secret mappings at runtime.
	 */
	setMappings(mappings: VaultSecretMapping[]): void {
		this.mappings.length = 0
		this.mappings.push(...mappings)
	}

	/**
	 * Perform a health check on the Vault server.
	 */
	async healthCheck(): Promise<boolean> {
		return this.client.healthCheck()
	}

	/**
	 * List secret keys at the given path.
	 */
	async listSecrets(path: string): Promise<string[]> {
		if (!this.client.isConfigured()) {
			this.warnNotConfigured()
			return []
		}

		try {
			return await this.client.list(path)
		} catch (error) {
			this.logger.error(
				`Failed to list secrets at ${path}: ${error instanceof Error ? error.message : String(error)}`,
			)
			return []
		}
	}

	/**
	 * Read secret key names (NOT values) at the given path.
	 */
	async getSecretKeys(path: string): Promise<string[]> {
		if (!this.client.isConfigured()) {
			return []
		}

		try {
			const secret = await this.client.read(path)
			return secret ? Object.keys(secret.data) : []
		} catch {
			return []
		}
	}

	private warnNotConfigured(): void {
		if (!this.hasWarnedNotConfigured) {
			this.logger.warn(
				'Vault is not configured. Set VAULT_ADDR and VAULT_TOKEN environment variables, ' +
					'or provide config via plugin options.',
			)
			this.hasWarnedNotConfigured = true
		}
	}
}
