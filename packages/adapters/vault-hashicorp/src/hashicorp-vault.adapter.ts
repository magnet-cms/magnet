import type {
  EnvVarRequirement,
  HashiCorpVaultConfig,
  VaultAdapter,
  VaultAuthConfig,
  VaultMagnetProvider,
  VaultSecretMeta,
} from '@magnet-cms/common'

// ============================================================================
// Internal types for node-vault-client (no @types available)
// ============================================================================

interface VaultClientAuthConfig {
  type: string
  config: Record<string, string | undefined>
}

interface VaultLease {
  getData(): Record<string, unknown>
}

interface VaultClientLib {
  read(path: string): Promise<VaultLease>
  write(path: string, data: Record<string, unknown>): Promise<unknown>
  list(path: string): Promise<VaultLease>
}

/**
 * HashiCorp Vault adapter for Magnet CMS.
 *
 * Uses the KV v2 secrets engine. Supports token and AppRole authentication.
 *
 * Configuration is loaded from the provided config object or from environment variables:
 *   - VAULT_ADDR: Vault server URL
 *   - VAULT_TOKEN: Vault token (token auth)
 *   - VAULT_ROLE_ID + VAULT_SECRET_ID: AppRole credentials
 *
 * @example
 * ```typescript
 * // In MagnetModule.forRoot()
 * MagnetModule.forRoot({
 *   vault: {
 *     adapter: 'hashicorp',
 *     hashicorp: {
 *       url: 'https://vault.example.com:8200',
 *       mountPath: 'secret',
 *     },
 *   },
 * })
 * ```
 */
export class HashiCorpVaultAdapter implements VaultAdapter {
  private client: VaultClientLib | null = null
  private readonly url: string
  private readonly auth: VaultAuthConfig
  private readonly mountPath: string

  /** Environment variables used by this adapter */
  static readonly envVars: EnvVarRequirement[] = [
    {
      name: 'VAULT_ADDR',
      required: true,
      description: 'HashiCorp Vault server URL',
    },
    {
      name: 'VAULT_TOKEN',
      required: false,
      description: 'Vault authentication token',
    },
  ]

  /**
   * Create a configured vault provider for MagnetModule.forRoot().
   * Auto-resolves config values from environment variables if not provided.
   *
   * @example
   * ```typescript
   * MagnetModule.forRoot([
   *   HashiCorpVaultAdapter.forRoot(),
   *   // or with explicit config:
   *   HashiCorpVaultAdapter.forRoot({
   *     url: 'https://vault.example.com:8200',
   *     mountPath: 'secret',
   *   }),
   * ])
   * ```
   */
  static forRoot(config?: HashiCorpVaultConfig): VaultMagnetProvider {
    return {
      type: 'vault',
      adapter: new HashiCorpVaultAdapter(config),
      envVars: HashiCorpVaultAdapter.envVars,
    }
  }

  constructor(config?: HashiCorpVaultConfig) {
    const url = config?.url ?? process.env.VAULT_ADDR
    if (!url) {
      throw new Error(
        'HashiCorp Vault URL is required. Set VAULT_ADDR environment variable or pass url in config.',
      )
    }
    this.url = url
    this.mountPath = config?.mountPath ?? 'secret'
    this.auth = config?.auth ?? this.detectAuth()
  }

  async get(key: string): Promise<string | null> {
    const client = await this.getClient()
    const path = this.buildReadPath(key)
    try {
      const lease = await client.read(path)
      const raw = lease.getData() as Record<string, unknown>
      // KV v2 wraps the user payload in a nested `data` key
      const payload = (raw.data as Record<string, unknown>) ?? raw
      const value = payload.value
      return typeof value === 'string' ? value : null
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null
      }
      throw error
    }
  }

  async set(key: string, value: string, description?: string): Promise<void> {
    const client = await this.getClient()
    const path = this.buildReadPath(key)
    // KV v2 expects data wrapped in a `data` key
    await client.write(path, { data: { value, _description: description } })
  }

  async delete(key: string): Promise<void> {
    // node-vault-client has no DELETE method; use fetch to call the metadata endpoint
    const path = this.buildMetadataPath(key)
    const token =
      this.auth.type === 'token' && this.auth.token ? this.auth.token : process.env.VAULT_TOKEN

    if (token) {
      const url = new URL(`/v1/${path}`, this.url).toString()
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'X-Vault-Token': token },
      })
      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete vault secret: ${response.status}`)
      }
      return
    }
    // Fallback: overwrite with empty string
    await this.set(key, '')
  }

  async list(prefix?: string): Promise<VaultSecretMeta[]> {
    const client = await this.getClient()
    const path = this.buildMetadataPath(prefix ?? '')
    try {
      const lease = await client.list(path)
      const raw = lease.getData() as Record<string, unknown>
      const keys = (raw.keys as string[]) ?? []
      // KV v2 list returns only key names; description is not available without N+1 reads
      return keys.map((name) => ({ name }))
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return []
      }
      throw error
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const url = new URL('/v1/sys/health', this.url)
      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      // Vault returns 200 for initialized+unsealed
      return response.status === 200
    } catch {
      return false
    }
  }

  private async getClient(): Promise<VaultClientLib> {
    if (this.client) {
      return this.client
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NodeVaultClient = require('node-vault-client')
    const instanceName = `magnet-hashicorp-${this.url}`

    NodeVaultClient.clear(instanceName)

    this.client = NodeVaultClient.boot(instanceName, {
      api: { url: this.url },
      auth: this.buildAuthConfig(this.auth),
      logger: false,
    }) as VaultClientLib

    return this.client
  }

  private buildAuthConfig(auth: VaultAuthConfig): VaultClientAuthConfig {
    switch (auth.type) {
      case 'token':
        return { type: 'token', config: { token: auth.token } }
      case 'appRole':
        return {
          type: 'appRole',
          config: { role_id: auth.roleId, secret_id: auth.secretId },
        }
    }
  }

  private detectAuth(): VaultAuthConfig {
    const token = process.env.VAULT_TOKEN
    if (token) {
      return { type: 'token', token }
    }

    const roleId = process.env.VAULT_ROLE_ID
    const secretId = process.env.VAULT_SECRET_ID
    if (roleId) {
      return { type: 'appRole', roleId, secretId }
    }

    throw new Error(
      'HashiCorp Vault authentication is required. Set VAULT_TOKEN or VAULT_ROLE_ID/VAULT_SECRET_ID environment variables.',
    )
  }

  private buildReadPath(key: string): string {
    if (key.startsWith(`${this.mountPath}/data/`)) {
      return key
    }
    if (key.startsWith(`${this.mountPath}/`)) {
      const subPath = key.slice(this.mountPath.length + 1)
      return `${this.mountPath}/data/${subPath}`
    }
    return `${this.mountPath}/data/${key}`
  }

  private buildMetadataPath(key: string): string {
    if (key.startsWith(`${this.mountPath}/metadata/`)) {
      return key
    }
    if (key.startsWith(`${this.mountPath}/`)) {
      const subPath = key.slice(this.mountPath.length + 1)
      return `${this.mountPath}/metadata/${subPath}`
    }
    return `${this.mountPath}/metadata/${key}`
  }

  private isNotFoundError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return message.includes('404') || message.includes('not found')
  }
}
