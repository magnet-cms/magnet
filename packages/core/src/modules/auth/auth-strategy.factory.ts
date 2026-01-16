import type { AuthConfig, AuthStrategy } from '@magnet-cms/common'
import type { UserService } from '~/modules/user'

// Type for custom strategy constructors
type AuthStrategyConstructor = new (
	config: AuthConfig,
	userService: UserService,
) => AuthStrategy

/**
 * Factory for creating auth strategy instances based on configuration.
 * The JWT strategy is built-in, while other strategies can be registered
 * dynamically or loaded from separate packages.
 *
 * @example
 * ```typescript
 * // Register a custom strategy before module initialization
 * AuthStrategyFactory.registerStrategy('custom', CustomAuthStrategy)
 *
 * // Later, in MagnetModule.forRoot()
 * MagnetModule.forRoot({
 *   auth: { strategy: 'custom', customOption: 'value' }
 * })
 * ```
 */
export class AuthStrategyFactory {
	private static cachedStrategy: AuthStrategy | null = null
	private static cachedConfig: AuthConfig | null = null
	private static customStrategies: Map<string, AuthStrategyConstructor> =
		new Map()

	/**
	 * Register a custom auth strategy class.
	 * Call this before MagnetModule.forRoot() to register custom strategies.
	 *
	 * @param name - Unique name for the strategy (used in config.strategy)
	 * @param strategyClass - Class constructor implementing AuthStrategy
	 *
	 * @example
	 * ```typescript
	 * import { AuthStrategyFactory } from '@magnet-cms/core'
	 * import { SupabaseAuthStrategy } from './strategies/supabase-auth.strategy'
	 *
	 * AuthStrategyFactory.registerStrategy('supabase', SupabaseAuthStrategy)
	 * ```
	 */
	static registerStrategy(
		name: string,
		strategyClass: AuthStrategyConstructor,
	): void {
		AuthStrategyFactory.customStrategies.set(name, strategyClass)
	}

	/**
	 * Get or create an auth strategy based on configuration.
	 * This is called internally by AuthModule.forRoot().
	 *
	 * @param config - Auth configuration
	 * @param userService - UserService for database operations
	 * @param jwtSecret - JWT secret (fallback from jwt.secret)
	 */
	static getStrategy(
		config: AuthConfig | undefined,
		userService: UserService,
		jwtSecret: string,
	): AuthStrategy {
		// Return cached strategy if config hasn't changed
		if (
			AuthStrategyFactory.cachedStrategy &&
			AuthStrategyFactory.configMatches(config)
		) {
			return AuthStrategyFactory.cachedStrategy
		}

		const strategyName = config?.strategy || 'jwt'

		switch (strategyName) {
			case 'jwt': {
				// Dynamically import to avoid circular dependencies
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
				// Check for custom registered strategies
				const CustomStrategy =
					AuthStrategyFactory.customStrategies.get(strategyName)
				if (CustomStrategy) {
					AuthStrategyFactory.cachedStrategy = new CustomStrategy(
						config || { strategy: strategyName },
						userService,
					)
				} else {
					throw new Error(
						`Unknown auth strategy: "${strategyName}". Use AuthStrategyFactory.registerStrategy() to register custom strategies, or use "jwt" for the default strategy.`,
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

	/**
	 * Clear the cached strategy (useful for testing)
	 */
	static clearCache(): void {
		AuthStrategyFactory.cachedStrategy = null
		AuthStrategyFactory.cachedConfig = null
	}

	/**
	 * Clear all registered custom strategies (useful for testing)
	 */
	static clearStrategies(): void {
		AuthStrategyFactory.customStrategies.clear()
	}

	/**
	 * Check if a strategy is registered
	 */
	static hasStrategy(name: string): boolean {
		return name === 'jwt' || AuthStrategyFactory.customStrategies.has(name)
	}

	/**
	 * Check if the provided config matches the cached config
	 */
	private static configMatches(config?: AuthConfig): boolean {
		if (!config && !AuthStrategyFactory.cachedConfig) {
			return true
		}
		if (!config || !AuthStrategyFactory.cachedConfig) {
			return false
		}
		// Simple reference check - for more complex cases, use deep equality
		return config === AuthStrategyFactory.cachedConfig
	}
}
