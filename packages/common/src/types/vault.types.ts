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
  /**
   * Direct PostgreSQL connection string to the Supabase database.
   * Used to access the vault schema without PostgREST schema exposure.
   * Defaults to the `DATABASE_URL` environment variable.
   *
   * @example "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
   */
  connectionString?: string
  /** @deprecated Use connectionString instead. Kept for backwards compatibility. */
  supabaseUrl?: string
  /** @deprecated Use connectionString instead. Kept for backwards compatibility. */
  supabaseServiceKey?: string
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
   * Retrieve a secret value by key.
   * @returns The decrypted string value or null if not found
   */
  abstract get(key: string): Promise<string | null>

  /**
   * Store or update a secret.
   *
   * @param key - Secret identifier
   * @param value - Plaintext value to encrypt and store
   * @param description - Optional human-readable description (stored unencrypted)
   */
  abstract set(key: string, value: string, description?: string): Promise<void>

  /**
   * Delete a secret by key.
   */
  abstract delete(key: string): Promise<void>

  /**
   * List all secrets with their metadata, optionally filtered by prefix.
   */
  abstract list(prefix?: string): Promise<VaultSecretMeta[]>

  /**
   * Check the health of the vault backend.
   */
  abstract healthCheck(): Promise<boolean>
}

// ============================================================================
// Vault Secret Metadata
// ============================================================================

/** Lightweight metadata returned by list() — does not include the secret value. */
export interface VaultSecretMeta {
  name: string
  description?: string
  /** ISO date string when the secret was last updated (adapter-dependent) */
  lastUpdated?: string
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
  secrets: VaultSecretMeta[]
}
