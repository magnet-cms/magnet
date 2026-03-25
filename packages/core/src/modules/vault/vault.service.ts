import { type VaultAdapter, type VaultAdapterType, type VaultSecretMeta } from '@magnet-cms/common'
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'

import { DbVaultAdapter } from './adapters/db-vault.adapter'
import { VAULT_ADAPTER, VAULT_CONFIG } from './vault.constants'
import type { VaultModuleConfig } from './vault.module'

interface CachedEntry {
  value: string
  expiresAt: number
}

const DEFAULT_CACHE_TTL = 300 // 5 minutes in seconds

/**
 * Core vault service for encrypted secrets management.
 *
 * Always backed by a VaultAdapter — unlike the plugin, this service
 * is never in a "not configured" state. It throws at initialization
 * if the adapter cannot start (e.g., missing VAULT_MASTER_KEY).
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   constructor(private readonly vault: VaultService) {}
 *
 *   async getDatabaseConfig(): Promise<{ uri: string }> {
 *     const secret = await this.vault.get<{ uri: string }>('database')
 *     if (!secret) throw new Error('database secret not found in vault')
 *     return secret
 *   }
 * }
 * ```
 */
@Injectable()
export class VaultService implements OnModuleInit {
  private readonly logger = new Logger(VaultService.name)
  private readonly cache = new Map<string, CachedEntry>()
  private readonly cacheTtl: number

  constructor(
    @Inject(VAULT_ADAPTER)
    private readonly adapter: VaultAdapter,
    @Inject(VAULT_CONFIG)
    private readonly config: VaultModuleConfig,
  ) {
    this.cacheTtl = config.cacheTtl ?? DEFAULT_CACHE_TTL
  }

  async onModuleInit(): Promise<void> {
    if (
      'initialize' in this.adapter &&
      typeof (this.adapter as { initialize?: () => Promise<void> }).initialize === 'function'
    ) {
      await (this.adapter as { initialize: () => Promise<void> }).initialize()
    }
    this.logger.log(`Vault service initialized (adapter: ${this.config.adapter ?? 'db'})`)
  }

  /**
   * Retrieve a secret value from the vault.
   *
   * @param key - Secret key (e.g., 'database', 'sendgrid')
   * @returns The decrypted string value, or null if not found
   */
  async get(key: string): Promise<string | null> {
    const cached = this.cache.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value
    }

    const value = await this.adapter.get(key)
    if (!value) {
      return null
    }

    if (this.cacheTtl > 0) {
      this.cache.set(key, {
        value,
        expiresAt: Date.now() + this.cacheTtl * 1000,
      })
    }

    return value
  }

  /**
   * Store or update a secret in the vault.
   * Invalidates the cache entry for the key.
   *
   * @param key - Secret key
   * @param value - Plaintext value to encrypt and store
   * @param description - Optional human-readable description (stored unencrypted)
   */
  async set(key: string, value: string, description?: string): Promise<void> {
    await this.adapter.set(key, value, description)
    this.cache.delete(key)
  }

  /**
   * Delete a secret from the vault.
   * Invalidates the cache entry for the key.
   *
   * @param key - Secret key to delete
   */
  async delete(key: string): Promise<void> {
    await this.adapter.delete(key)
    this.cache.delete(key)
  }

  /**
   * List all secrets with metadata, optionally filtered by prefix.
   *
   * @param prefix - Optional prefix to filter keys
   */
  async list(prefix?: string): Promise<VaultSecretMeta[]> {
    return this.adapter.list(prefix)
  }

  /**
   * Force-refresh a cached secret by clearing its cache entry.
   *
   * @param key - Secret key to refresh
   */
  async refresh(key: string): Promise<void> {
    this.cache.delete(key)
    await this.get(key)
  }

  /**
   * Check the health of the vault backend.
   */
  async healthCheck(): Promise<boolean> {
    return this.adapter.healthCheck()
  }

  /**
   * Get the adapter type currently in use.
   */
  getAdapterType(): VaultAdapterType {
    return (this.config.adapter ?? 'db') as VaultAdapterType
  }

  /**
   * Whether the VAULT_MASTER_KEY env var is set (DB adapter only).
   */
  isMasterKeyConfigured(): boolean {
    return DbVaultAdapter.isMasterKeyConfigured()
  }

  /**
   * Clear the entire in-memory secret cache.
   */
  clearCache(): void {
    this.cache.clear()
  }
}
