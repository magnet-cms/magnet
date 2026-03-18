import type { AuthConfig, AuthStrategy } from '@magnet-cms/common'
import type { UserService } from '~/modules/user'

// Type for custom strategy constructors
type AuthStrategyConstructor = new (
	config: AuthConfig,
	userService: UserService,
) => AuthStrategy

/**
 * Factory for creating auth strategy instances.
 *
 * The JWT strategy is built-in. Other strategies (supabase, clerk)
 * register themselves via their adapter's `.forRoot()` method.
 *
 * @example
 * ```typescript
 * // Strategies are auto-registered by adapter forRoot():
 * MagnetModule.forRoot([
 *   SupabaseAuthAdapter.forRoot(), // registers 'supabase' strategy internally
 * ])
 * ```
 */
export class AuthStrategyFactory {
	private static cachedStrategy: AuthStrategy | null = null
	private static cachedConfig: AuthConfig | null = null
	private static customStrategies: Map<string, AuthStrategyConstructor> =
		new Map()

	/**
	 * Register a custom auth strategy class.
	 * Called internally by auth adapter `.forRoot()` methods.
	 *
	 * @param name - Unique name for the strategy (used in config.strategy)
	 * @param strategyClass - Class constructor implementing AuthStrategy
	 */
	static registerStrategy(
		name: string,
		strategyClass: AuthStrategyConstructor,
	): void {
		AuthStrategyFactory.customStrategies.set(name, strategyClass)
	}

	/**
	 * Get or create an auth strategy based on configuration.
	 * Called internally by AuthModule.forRoot().
	 *
	 * @param config - Auth configuration
	 * @param userService - UserService for database operations
	 * @param jwtSecret - JWT secret (fallback from global options)
	 */
	static getStrategy(
		config: AuthConfig | undefined,
		userService: UserService,
		jwtSecret: string,
	): AuthStrategy {
		if (
			AuthStrategyFactory.cachedStrategy &&
			AuthStrategyFactory.configMatches(config)
		) {
			return AuthStrategyFactory.cachedStrategy
		}

		const strategyName = config?.strategy || 'jwt'

		switch (strategyName) {
			case 'jwt': {
				const { JwtAuthStrategy } = require('./strategies/jwt-auth.strategy')
				AuthStrategyFactory.cachedStrategy = new JwtAuthStrategy(
					{
						strategy: 'jwt',
						jwt: {
							secret: config?.jwt?.secret || jwtSecret,
							expiresIn: config?.jwt?.expiresIn || '7d',
						},
					},
					userService,
				)
				break
			}

			default: {
				const CustomStrategy =
					AuthStrategyFactory.customStrategies.get(strategyName)
				if (CustomStrategy) {
					AuthStrategyFactory.cachedStrategy = new CustomStrategy(
						config || { strategy: strategyName },
						userService,
					)
				} else {
					throw new Error(
						`Unknown auth strategy: "${strategyName}". Ensure the auth adapter's .forRoot() is included in MagnetModule.forRoot() providers.`,
					)
				}
			}
		}

		AuthStrategyFactory.cachedConfig = config || null

		if (!AuthStrategyFactory.cachedStrategy) {
			throw new Error('Failed to initialize auth strategy')
		}

		return AuthStrategyFactory.cachedStrategy
	}

	/** Clear the cached strategy (useful for testing) */
	static clearCache(): void {
		AuthStrategyFactory.cachedStrategy = null
		AuthStrategyFactory.cachedConfig = null
	}

	/** Clear all registered custom strategies (useful for testing) */
	static clearStrategies(): void {
		AuthStrategyFactory.customStrategies.clear()
	}

	/** Check if a strategy is registered */
	static hasStrategy(name: string): boolean {
		return name === 'jwt' || AuthStrategyFactory.customStrategies.has(name)
	}

	private static configMatches(config?: AuthConfig): boolean {
		if (!config && !AuthStrategyFactory.cachedConfig) {
			return true
		}
		if (!config || !AuthStrategyFactory.cachedConfig) {
			return false
		}
		return config === AuthStrategyFactory.cachedConfig
	}
}
