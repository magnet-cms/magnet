// ============================================================================
// Vault Authentication Types
// ============================================================================

/**
 * Token-based authentication configuration for Vault.
 * The token is read from environment variable VAULT_TOKEN.
 */
export interface VaultTokenAuth {
	type: 'token'
	/** Vault token — typically from VAULT_TOKEN env var */
	token: string
}

/**
 * AppRole-based authentication configuration for Vault.
 * Used for machine-to-machine authentication.
 */
export interface VaultAppRoleAuth {
	type: 'appRole'
	/** AppRole role ID */
	roleId: string
	/** AppRole secret ID (optional for some configurations) */
	secretId?: string
}

/**
 * Discriminated union of supported Vault authentication methods.
 */
export type VaultAuthConfig = VaultTokenAuth | VaultAppRoleAuth

// ============================================================================
// Vault Configuration Types
// ============================================================================

/**
 * Core Vault connection configuration.
 */
export interface VaultConfig {
	/** Vault server URL (e.g., 'https://vault.example.com:8200') */
	url: string
	/** Authentication configuration */
	auth: VaultAuthConfig
	/** Secrets engine mount path (default: 'secret') */
	mountPath?: string
	/** Namespace for Vault Enterprise (optional) */
	namespace?: string
}

/**
 * Mapping of a Vault secret path to a Magnet config target.
 */
export interface VaultSecretMapping {
	/** Full Vault path (e.g., 'secret/data/magnet/database') */
	path: string
	/** Target config module name (e.g., 'database', 'jwt', 'email') */
	mapTo: string
	/** Whether to watch this secret for rotation (default: false) */
	watch?: boolean
}

// ============================================================================
// Bootstrap Types
// ============================================================================

/**
 * Path configuration for a single module in VaultBootstrap.
 */
export interface VaultBootstrapPathConfig {
	/** Explicit Vault path. If omitted, uses convention: {conventionPrefix}/{moduleName} */
	vaultPath?: string
	/** Environment variable prefix for fallback mode (e.g., 'DB_' reads DB_URI, DB_HOST, etc.) */
	envPrefix?: string
}

/**
 * Options for VaultBootstrap.resolve() — called before NestJS boots.
 */
export interface VaultBootstrapOptions {
	/** Vault server URL. Auto-detected from VAULT_ADDR env var if omitted. */
	url?: string
	/** Authentication config. Auto-detected from VAULT_TOKEN if omitted. */
	auth?: VaultAuthConfig
	/** Secrets engine mount path (default: 'secret') */
	mountPath?: string
	/** Convention prefix for auto-mapped paths (default: 'secret/data/magnet') */
	conventionPrefix?: string
	/** Module name → path config mapping */
	paths: Record<string, VaultBootstrapPathConfig>
	/** Fall back to environment variables when Vault not configured (default: true) */
	fallbackToEnv?: boolean
}

/**
 * Resolved secrets from VaultBootstrap, keyed by module name.
 *
 * @example
 * ```typescript
 * const secrets = await VaultBootstrap.resolve({ paths: { db: {}, jwt: {} } })
 * // secrets.db => { uri: 'mongodb://...', host: '...' }
 * // secrets.jwt => { secret: 'my-jwt-secret' }
 * ```
 */
export type VaultResolvedSecrets = Record<string, Record<string, unknown>>

// ============================================================================
// Vault Client Interface
// ============================================================================

/**
 * Result of reading a secret from Vault.
 */
export interface VaultSecretData {
	/** Secret key-value data */
	data: Record<string, unknown>
	/** Secret metadata (version, timestamps) */
	metadata?: {
		version?: number
		createdTime?: string
		deletionTime?: string
		destroyed?: boolean
	}
}

/**
 * Interface for Vault client implementations (real Vault or env fallback).
 */
export interface VaultClientInterface {
	/** Read a secret at the given path */
	read(path: string): Promise<VaultSecretData | null>
	/** Write a secret at the given path */
	write(path: string, data: Record<string, unknown>): Promise<void>
	/** List secret keys at the given path */
	list(path: string): Promise<string[]>
	/** Check Vault server health */
	healthCheck(): Promise<boolean>
	/** Whether this client is connected to a real Vault server */
	isConfigured(): boolean
}

// ============================================================================
// Cache Types
// ============================================================================

/**
 * Cached secret entry with TTL.
 */
export interface CachedSecret {
	/** Cached secret data */
	data: Record<string, unknown>
	/** Timestamp when this entry expires */
	expiresAt: number
}

// ============================================================================
// Plugin Options
// ============================================================================

/**
 * Options passed to VaultPlugin via PluginConfig.options.
 */
export interface VaultPluginOptions {
	/** Vault connection config (optional — can be configured via admin settings) */
	config?: VaultConfig
	/** Cache TTL in seconds (default: 300) */
	cacheTtl?: number
	/** Secret mappings for explicit path overrides */
	mappings?: VaultSecretMapping[]
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response for GET /vault/status endpoint.
 */
export interface VaultStatusResponse {
	/** Whether Vault is configured */
	configured: boolean
	/** Whether Vault is connected and healthy */
	connected: boolean
	/** Vault server URL (masked) */
	url: string | null
	/** Authentication method in use */
	authMethod: string | null
	/** Secrets engine mount path */
	mountPath: string
}

/**
 * Response for POST /vault/test-connection endpoint.
 */
export interface VaultTestConnectionResponse {
	/** Whether the connection test succeeded */
	success: boolean
	/** Error message if connection failed */
	error?: string
}
