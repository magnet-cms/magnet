// ============================================================================
// Vault Adapter Type
// ============================================================================

export type VaultAdapterType = 'db' | 'hashicorp' | 'supabase'

// ============================================================================
// Vault Configuration Types
// ============================================================================

/**
 * Token-based authentication for HashiCorp Vault.
 * Token is read from VAULT_TOKEN env var.
 */
export interface VaultTokenAuth {
	type: 'token'
	token: string
}

/**
 * AppRole-based authentication for HashiCorp Vault.
 */
export interface VaultAppRoleAuth {
	type: 'appRole'
	roleId: string
	secretId?: string
}

export type VaultAuthConfig = VaultTokenAuth | VaultAppRoleAuth

/**
 * Configuration for the HashiCorp Vault adapter.
 */
export interface HashiCorpVaultConfig {
	/** Vault server URL (e.g., 'https://vault.example.com:8200'). Defaults to VAULT_ADDR env var. */
	url?: string
	/** Authentication configuration. Defaults to VAULT_TOKEN env var. */
	auth?: VaultAuthConfig
	/** Secrets engine mount path (default: 'secret') */
	mountPath?: string
	/** Vault Enterprise namespace (optional) */
	namespace?: string
}

/**
 * Configuration for the Supabase Vault adapter.
 */
export interface SupabaseVaultConfig {
	/** Supabase project URL */
	supabaseUrl: string
	/** Supabase service role key (required for vault operations) */
	supabaseServiceKey: string
}

/**
 * Top-level vault configuration passed to MagnetModuleOptions.
 */
export interface VaultConfig {
	/** Vault adapter to use (default: 'db') */
	adapter?: VaultAdapterType
	/** Cache TTL in seconds (default: 300) */
	cacheTtl?: number
	/** HashiCorp Vault adapter configuration */
	hashicorp?: HashiCorpVaultConfig
	/** Supabase Vault adapter configuration */
	supabase?: SupabaseVaultConfig
}

// ============================================================================
// Vault Adapter Abstract Class
// ============================================================================

/**
 * Abstract base class for vault adapters.
 *
 * All adapters encrypt secrets at rest. Implementations determine
 * the storage backend (app DB, HashiCorp Vault, Supabase Vault).
 */
export abstract class VaultAdapter {
	/**
	 * Retrieve a secret by key.
	 * @returns The secret data or null if not found
	 */
	abstract get(key: string): Promise<Record<string, unknown> | null>

	/**
	 * Store or update a secret.
	 */
	abstract set(key: string, data: Record<string, unknown>): Promise<void>

	/**
	 * Delete a secret by key.
	 */
	abstract delete(key: string): Promise<void>

	/**
	 * List all secret keys, optionally filtered by prefix.
	 */
	abstract list(prefix?: string): Promise<string[]>

	/**
	 * Check the health of the vault backend.
	 */
	abstract healthCheck(): Promise<boolean>
}

// ============================================================================
// API Response Types
// ============================================================================

export interface VaultStatusResponse {
	/** Whether the vault adapter is healthy */
	healthy: boolean
	/** The adapter type in use */
	adapter: VaultAdapterType
	/** Whether VAULT_MASTER_KEY is set (db adapter only) */
	masterKeyConfigured?: boolean
}

export interface VaultSecretListResponse {
	keys: string[]
}
