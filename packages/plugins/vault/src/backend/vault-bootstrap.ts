import type {
	VaultBootstrapOptions,
	VaultBootstrapPathConfig,
	VaultClientInterface,
	VaultResolvedSecrets,
} from './types'
import { EnvFallbackClient, VaultClient } from './vault.client'

const DEFAULT_CONVENTION_PREFIX = 'secret/data/magnet'

/**
 * Boot-time secret resolution for Magnet CMS.
 *
 * Call `VaultBootstrap.resolve()` before `MagnetModule.forRoot()` to fetch
 * secrets from Vault (or fall back to environment variables) before NestJS boots.
 *
 * @example
 * ```typescript
 * const secrets = await VaultBootstrap.resolve({
 *   fallbackToEnv: true,
 *   paths: {
 *     db: { vaultPath: 'secret/data/magnet/database', envPrefix: 'DB_' },
 *     jwt: { envPrefix: 'JWT_' },
 *   },
 * })
 *
 * MagnetModule.forRoot({
 *   db: { uri: secrets.db.uri as string },
 *   jwt: { secret: secrets.jwt.secret as string },
 * })
 * ```
 */
export class VaultBootstrap {
	/**
	 * Resolve secrets from Vault or environment variables.
	 *
	 * @param options - Bootstrap configuration
	 * @returns Record of module name to resolved secret key-value pairs
	 * @throws Error if Vault is configured but unreachable and fallbackToEnv is false
	 */
	static async resolve(
		options: VaultBootstrapOptions,
	): Promise<VaultResolvedSecrets> {
		const fallbackToEnv = options.fallbackToEnv ?? true
		const conventionPrefix =
			options.conventionPrefix ?? DEFAULT_CONVENTION_PREFIX

		const client = VaultBootstrap.createClient(options)
		const isVault = client.isConfigured()

		if (isVault) {
			// Verify Vault is reachable
			const healthy = await client.healthCheck()
			if (!healthy) {
				if (fallbackToEnv) {
					console.warn(
						'[Magnet Vault] Vault server unreachable, falling back to environment variables',
					)
					return VaultBootstrap.resolveFromEnv(options.paths)
				}
				throw new Error(
					`[Magnet Vault] Vault server at ${options.url ?? process.env.VAULT_ADDR} is unreachable. Set fallbackToEnv: true to fall back to environment variables.`,
				)
			}
			console.log('[Magnet Vault] Connected to Vault, resolving secrets...')
			return VaultBootstrap.resolveFromVault(
				client,
				options.paths,
				conventionPrefix,
			)
		}

		if (fallbackToEnv) {
			console.log(
				'[Magnet Vault] No Vault configured, using environment variables',
			)
			return VaultBootstrap.resolveFromEnv(options.paths)
		}

		throw new Error(
			'[Magnet Vault] No Vault server configured and fallbackToEnv is disabled. ' +
				'Set VAULT_ADDR and VAULT_TOKEN environment variables, or enable fallbackToEnv.',
		)
	}

	/**
	 * Create the appropriate client based on options and environment.
	 */
	private static createClient(
		options: VaultBootstrapOptions,
	): VaultClientInterface {
		const url = options.url ?? process.env.VAULT_ADDR
		const token = process.env.VAULT_TOKEN

		if (url && options.auth) {
			return new VaultClient({
				url,
				auth: options.auth,
				mountPath: options.mountPath,
			})
		}

		if (url && token) {
			return new VaultClient({
				url,
				auth: { type: 'token', token },
				mountPath: options.mountPath,
			})
		}

		return new EnvFallbackClient()
	}

	/**
	 * Resolve all module secrets from Vault.
	 */
	private static async resolveFromVault(
		client: VaultClientInterface,
		paths: Record<string, VaultBootstrapPathConfig>,
		conventionPrefix: string,
	): Promise<VaultResolvedSecrets> {
		const results: VaultResolvedSecrets = {}

		const entries = Object.entries(paths)
		const settled = await Promise.allSettled(
			entries.map(async ([moduleName, pathConfig]) => {
				const vaultPath =
					pathConfig.vaultPath ?? `${conventionPrefix}/${moduleName}`
				const secret = await client.read(vaultPath)
				return { moduleName, data: secret?.data ?? {} }
			}),
		)

		for (const result of settled) {
			if (result.status === 'fulfilled') {
				results[result.value.moduleName] = result.value.data
			} else {
				console.error(`[Magnet Vault] Failed to read secret: ${result.reason}`)
			}
		}

		return results
	}

	/**
	 * Resolve all module secrets from environment variables.
	 */
	private static resolveFromEnv(
		paths: Record<string, VaultBootstrapPathConfig>,
	): VaultResolvedSecrets {
		const results: VaultResolvedSecrets = {}

		for (const [moduleName, pathConfig] of Object.entries(paths)) {
			const prefix = pathConfig.envPrefix ?? `${moduleName.toUpperCase()}_`
			const data: Record<string, unknown> = {}

			for (const [key, value] of Object.entries(process.env)) {
				if (key.startsWith(prefix) && value !== undefined) {
					const fieldName = key
						.slice(prefix.length)
						.toLowerCase()
						.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase())
					data[fieldName] = value
				}
			}

			results[moduleName] = data
		}

		return results
	}
}
