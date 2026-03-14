import type {
	VaultAuthConfig,
	VaultClientInterface,
	VaultConfig,
	VaultSecretData,
} from './types'

/**
 * Vault client implementation using node-vault-client.
 *
 * Wraps the node-vault-client library with typed interface for KV v2 operations.
 */
export class VaultClient implements VaultClientInterface {
	private client: VaultClientLib | null = null
	private readonly config: VaultConfig

	constructor(config: VaultConfig) {
		this.config = config
	}

	/**
	 * Initialize the underlying node-vault-client connection.
	 * Called lazily on first operation.
	 */
	private async getClient(): Promise<VaultClientLib> {
		if (this.client) {
			return this.client
		}

		const NodeVaultClient = require('node-vault-client')
		const authConfig = this.buildAuthConfig(this.config.auth)

		// Use a unique instance name based on URL to support multiple Vault servers
		const instanceName = `magnet-${this.config.url}`

		// Clear any existing instance to avoid stale connections
		NodeVaultClient.clear(instanceName)

		this.client = NodeVaultClient.boot(instanceName, {
			api: { url: this.config.url },
			auth: authConfig,
			logger: false,
		}) as VaultClientLib

		return this.client
	}

	/**
	 * Build auth configuration for node-vault-client from our typed config.
	 */
	private buildAuthConfig(auth: VaultAuthConfig): VaultClientAuthConfig {
		switch (auth.type) {
			case 'token':
				return {
					type: 'token',
					config: { token: auth.token },
				}
			case 'appRole':
				return {
					type: 'appRole',
					config: {
						role_id: auth.roleId,
						secret_id: auth.secretId,
					},
				}
		}
	}

	/**
	 * Build the full KV v2 read path.
	 * KV v2 uses `/data/` prefix for reading secrets.
	 */
	private buildReadPath(path: string): string {
		const mount = this.config.mountPath ?? 'secret'
		// If path already starts with the mount, use as-is
		if (path.startsWith(`${mount}/data/`)) {
			return path
		}
		// If path starts with mount but without /data/, inject /data/
		if (path.startsWith(`${mount}/`)) {
			const subPath = path.slice(mount.length + 1)
			return `${mount}/data/${subPath}`
		}
		// Otherwise, prepend mount/data/
		return `${mount}/data/${path}`
	}

	/**
	 * Build the full KV v2 metadata path for listing.
	 */
	private buildMetadataPath(path: string): string {
		const mount = this.config.mountPath ?? 'secret'
		if (path.startsWith(`${mount}/metadata/`)) {
			return path
		}
		if (path.startsWith(`${mount}/`)) {
			const subPath = path.slice(mount.length + 1)
			return `${mount}/metadata/${subPath}`
		}
		return `${mount}/metadata/${path}`
	}

	async read(path: string): Promise<VaultSecretData | null> {
		const client = await this.getClient()
		try {
			const lease = await client.read(this.buildReadPath(path))
			const rawData = lease.getData() as Record<string, unknown>

			// KV v2 wraps data in a nested `data` key
			const secretData = (rawData.data as Record<string, unknown>) ?? rawData
			const metadata = rawData.metadata as VaultSecretData['metadata']

			return { data: secretData, metadata }
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			if (errorMessage.includes('404') || errorMessage.includes('not found')) {
				return null
			}
			throw error
		}
	}

	async write(path: string, data: Record<string, unknown>): Promise<void> {
		const client = await this.getClient()
		const writePath = this.buildReadPath(path)
		// KV v2 expects data wrapped in a `data` key
		await client.write(writePath, { data })
	}

	async list(path: string): Promise<string[]> {
		const client = await this.getClient()
		try {
			const lease = await client.list(this.buildMetadataPath(path))
			const rawData = lease.getData() as Record<string, unknown>
			return (rawData.keys as string[]) ?? []
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			if (errorMessage.includes('404') || errorMessage.includes('not found')) {
				return []
			}
			throw error
		}
	}

	async healthCheck(): Promise<boolean> {
		try {
			const url = new URL('/v1/sys/health', this.config.url)
			const response = await fetch(url.toString(), {
				method: 'GET',
				signal: AbortSignal.timeout(5000),
			})
			// Vault returns 200 for initialized+unsealed, 429/472/473/501/503 for other states
			return response.status === 200
		} catch {
			return false
		}
	}

	isConfigured(): boolean {
		return true
	}
}

/**
 * Environment variable fallback client.
 *
 * Used when no Vault server is configured. Reads secrets from
 * environment variables using a prefix convention.
 */
export class EnvFallbackClient implements VaultClientInterface {
	async read(path: string): Promise<VaultSecretData | null> {
		// Extract the last segment as the "module" name
		// e.g., "secret/data/magnet/database" -> "database"
		const segments = path.split('/')
		const moduleName = segments[segments.length - 1]
		if (!moduleName) {
			return null
		}

		const prefix = `${moduleName.toUpperCase()}_`
		const data: Record<string, unknown> = {}

		for (const [key, value] of Object.entries(process.env)) {
			if (key.startsWith(prefix) && value !== undefined) {
				// Convert ENV_VAR_NAME to camelCase key
				// e.g., DATABASE_URI -> uri, DATABASE_HOST -> host
				const fieldName = key
					.slice(prefix.length)
					.toLowerCase()
					.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase())
				data[fieldName] = value
			}
		}

		if (Object.keys(data).length === 0) {
			return null
		}

		return { data }
	}

	async write(_path: string, _data: Record<string, unknown>): Promise<void> {
		throw new Error(
			'Cannot write secrets in env fallback mode. Configure a Vault server to enable writes.',
		)
	}

	async list(_path: string): Promise<string[]> {
		return []
	}

	async healthCheck(): Promise<boolean> {
		return false
	}

	isConfigured(): boolean {
		return false
	}
}

/**
 * Factory function to create the appropriate Vault client.
 *
 * Returns a real VaultClient when config is provided,
 * or an EnvFallbackClient when no Vault server is configured.
 */
export function createVaultClient(config?: VaultConfig): VaultClientInterface {
	if (config?.url) {
		return new VaultClient(config)
	}

	// Auto-detect from environment
	const vaultAddr = process.env.VAULT_ADDR
	const vaultToken = process.env.VAULT_TOKEN

	if (vaultAddr && vaultToken) {
		return new VaultClient({
			url: vaultAddr,
			auth: { type: 'token', token: vaultToken },
			mountPath: config?.mountPath,
		})
	}

	return new EnvFallbackClient()
}

// ============================================================================
// Internal types for node-vault-client (no @types available)
// ============================================================================

interface VaultClientAuthConfig {
	type: string
	config: Record<string, string | undefined>
}

interface VaultLease {
	getData(): Record<string, unknown>
	getValue(key: string): unknown
	isRenewable(): boolean
}

interface VaultClientLib {
	read(path: string): Promise<VaultLease>
	write(path: string, data: Record<string, unknown>): Promise<unknown>
	list(path: string): Promise<VaultLease>
}
