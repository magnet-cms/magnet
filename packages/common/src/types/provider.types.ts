import type { Type } from '@nestjs/common'
import type { AuthConfig } from './auth.types'
import type {
	AdminConfig,
	InternationalizationOptions,
	PlaygroundOptions,
} from './config.types'
import type { DBConfig, DatabaseAdapter } from './database.types'
import type { EmailAdapter } from './email.types'
import type { RBACModuleOptions } from './rbac.types'
import type { StorageAdapter } from './storage.types'
import type { VaultAdapter } from './vault.types'

// ============================================================================
// Environment Variable Types
// ============================================================================

/**
 * Declares a required or optional environment variable for an adapter/plugin.
 * Used by MagnetModule to validate all env vars before NestJS bootstraps.
 */
export interface EnvVarRequirement {
	/** Environment variable name (e.g., 'DATABASE_URL') */
	name: string
	/** Whether this env var is required for the adapter to function */
	required: boolean
	/** Human-readable description shown in error messages */
	description?: string
}

// ============================================================================
// Global Options (second argument to MagnetModule.forRoot)
// ============================================================================

/**
 * Global configuration options passed as the second argument to MagnetModule.forRoot().
 * Contains cross-cutting settings that don't belong to any specific adapter.
 *
 * @example
 * ```typescript
 * MagnetModule.forRoot([...providers], {
 *   jwt: { secret: 'my-secret' },
 *   admin: true,
 *   rbac: { enabled: true },
 * })
 * ```
 */
export interface MagnetGlobalOptions {
	/** JWT configuration for authentication */
	jwt?: {
		/** JWT signing secret. Auto-resolved from JWT_SECRET env var if not provided. */
		secret?: string
		/** Token expiration time (e.g., '7d', '1h'). Default: '7d' */
		expiresIn?: string
	}
	/**
	 * Admin panel configuration
	 * @example admin: true // Enable with defaults
	 * @example admin: { enabled: true, path: '/dashboard' }
	 */
	admin?: boolean | AdminConfig
	/** RBAC (Role-Based Access Control) configuration */
	rbac?: RBACModuleOptions
	/** Internationalization settings */
	internationalization?: InternationalizationOptions
	/** Playground settings for Content Builder */
	playground?: PlaygroundOptions
}

// ============================================================================
// Provider Types (discriminated union)
// ============================================================================

/**
 * Base interface for all Magnet providers.
 * Every adapter and plugin declares its environment variable requirements.
 */
interface BaseMagnetProvider {
	/** Environment variables this provider needs */
	envVars: EnvVarRequirement[]
}

/**
 * Database adapter provider.
 * Returned by database adapter `.forRoot()` methods.
 */
export interface DatabaseMagnetProvider extends BaseMagnetProvider {
	type: 'database'
	/** The database adapter instance */
	adapter: DatabaseAdapter
	/** Resolved database configuration */
	config: DBConfig
}

/**
 * Storage adapter provider.
 * Returned by storage adapter `.forRoot()` methods.
 */
export interface StorageMagnetProvider extends BaseMagnetProvider {
	type: 'storage'
	/** The storage adapter instance */
	adapter: StorageAdapter
	/** Adapter-specific resolved configuration */
	config?: Record<string, unknown>
}

/**
 * Email adapter provider.
 * Returned by email adapter `.forRoot()` methods.
 */
export interface EmailMagnetProvider extends BaseMagnetProvider {
	type: 'email'
	/** The email adapter instance */
	adapter: EmailAdapter
	/** Default email settings */
	defaults?: { from?: string; replyTo?: string }
}

/**
 * Vault adapter provider.
 * Returned by vault adapter `.forRoot()` methods.
 *
 * Supports two patterns:
 * - Direct `adapter` for adapters that don't need NestJS DI (e.g., HashiCorp)
 * - `adapterFactory` for adapters that need ModuleRef (e.g., built-in DB vault)
 */
export interface VaultMagnetProvider extends BaseMagnetProvider {
	type: 'vault'
	/** Direct adapter instance (for adapters that don't need DI) */
	adapter?: VaultAdapter
	/** Factory function for adapters that need NestJS ModuleRef */
	adapterFactory?: (moduleRef: unknown) => VaultAdapter
	/** Vault configuration */
	config?: { cacheTtl?: number }
}

/**
 * Auth strategy provider.
 * Returned by auth adapter `.forRoot()` methods.
 */
export interface AuthMagnetProvider extends BaseMagnetProvider {
	type: 'auth'
	/** Auth configuration including strategy name */
	config: AuthConfig
}

/**
 * Plugin provider.
 * Returned by plugin `.forRoot()` methods.
 */
export interface PluginMagnetProvider extends BaseMagnetProvider {
	type: 'plugin'
	/** The @Plugin() decorated class */
	plugin: Type<unknown>
	/** Plugin-specific options (injected via PLUGIN_OPTIONS token) */
	options?: Record<string, unknown>
}

/**
 * Discriminated union of all provider types.
 * Each adapter/plugin `.forRoot()` returns one of these variants.
 *
 * @example
 * ```typescript
 * const providers: MagnetProvider[] = [
 *   MongooseDatabaseAdapter.forRoot(),
 *   StripePlugin.forRoot({ currency: 'usd' }),
 * ]
 * MagnetModule.forRoot(providers, { admin: true })
 * ```
 */
export type MagnetProvider =
	| DatabaseMagnetProvider
	| StorageMagnetProvider
	| EmailMagnetProvider
	| VaultMagnetProvider
	| AuthMagnetProvider
	| PluginMagnetProvider
