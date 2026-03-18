import type { MagnetGlobalOptions, MagnetProvider } from '@magnet-cms/common'

/** Provider type labels for error output */
const PROVIDER_TYPE_LABELS: Record<string, string> = {
	database: 'Database',
	storage: 'Storage',
	email: 'Email',
	vault: 'Vault',
	auth: 'Auth',
	plugin: 'Plugin',
}

interface ValidateOptions {
	/** When false, throws an Error instead of calling process.exit(1). Default: true */
	exitOnFailure?: boolean
}

/**
 * Validate that all required environment variables are set before NestJS bootstraps.
 * Collects requirements from all providers and global options, checks process.env,
 * and either exits the process or throws with a detailed error message.
 *
 * @param providers - Array of registered MagnetProvider instances
 * @param globalOptions - Optional global configuration
 * @param options - Validation behavior options
 */
export function validateEnvironment(
	providers: MagnetProvider[],
	globalOptions?: MagnetGlobalOptions,
	options?: ValidateOptions,
): void {
	const exitOnFailure = options?.exitOnFailure ?? true

	// Collect missing env vars grouped by provider type
	const missingByType = new Map<
		string,
		{ name: string; description?: string }[]
	>()

	for (const provider of providers) {
		for (const envVar of provider.envVars) {
			if (!envVar.required) continue

			const value = process.env[envVar.name]
			if (!value || value.trim() === '') {
				const label = getProviderLabel(provider)
				if (!missingByType.has(label)) {
					missingByType.set(label, [])
				}
				missingByType.get(label)?.push({
					name: envVar.name,
					description: envVar.description,
				})
			}
		}
	}

	// Check JWT_SECRET: required unless explicitly provided in globalOptions
	const jwtSecretProvided =
		globalOptions?.jwt?.secret && globalOptions.jwt.secret.trim() !== ''
	const jwtSecretInEnv =
		process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== ''

	if (!jwtSecretProvided && !jwtSecretInEnv) {
		const label = 'Global (JWT)'
		if (!missingByType.has(label)) {
			missingByType.set(label, [])
		}
		missingByType.get(label)?.push({
			name: 'JWT_SECRET',
			description: 'JWT signing secret for authentication',
		})
	}

	if (missingByType.size === 0) return

	// Build error message
	const lines: string[] = ['Missing required environment variables', '']

	for (const [label, vars] of missingByType) {
		lines.push(`  ${label}:`)
		for (const v of vars) {
			lines.push(`    - ${v.name}${v.description ? `: ${v.description}` : ''}`)
		}
		lines.push('')
	}

	lines.push(
		'Set these in your .env file or environment before starting the application.',
	)

	const message = lines.join('\n')

	if (exitOnFailure) {
		console.error(`\n❌ Magnet CMS: ${message}`)
		process.exit(1)
	}

	throw new Error(message)
}

/**
 * Get a human-readable label for a provider, used in error grouping.
 */
function getProviderLabel(provider: MagnetProvider): string {
	const baseLabel = PROVIDER_TYPE_LABELS[provider.type] || provider.type
	if (provider.type === 'plugin' && provider.plugin?.name) {
		return `${baseLabel} (${provider.plugin.name})`
	}
	return baseLabel
}
