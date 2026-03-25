import { Type } from '@nestjs/common'

import type { AuthConfig } from './auth.types'
import { DBConfig } from './database.types'
import type { EmailConfig } from './email.types'
import type { PluginConfig } from './plugin.types'
import type { RBACModuleOptions } from './rbac.types'
import { StorageConfig } from './storage.types'
import type { VaultConfig } from './vault.types'

export interface InternationalizationOptions {
  locales: string[]
  defaultLocale: string
}

export interface PlaygroundOptions {
  /**
   * Path to the directory where module folders will be created
   * @example './src/modules'
   */
  modulesPath?: string
  /**
   * @deprecated Use modulesPath instead
   * Path to the directory where schema files will be saved
   */
  schemasPath?: string
}

export interface GraphQLConfig {
  /** GraphQL endpoint path (default: '/graphql') */
  path?: string
  /** Enable Apollo Sandbox/Playground (default: true) */
  playground?: boolean
  /** Enable introspection queries (default: true) */
  introspection?: boolean
  /** Enable debug mode (default: false) */
  debug?: boolean
}

/**
 * Configuration options for the OpenAPI/Swagger module.
 */
export interface OpenAPIConfig {
  /** Enable or disable OpenAPI support. Default: enabled in development, disabled in production */
  enabled?: boolean
  /** Path to serve the Swagger UI (default: '/api-docs') */
  path?: string
  /** API title shown in the Swagger UI (default: 'Magnet CMS API') */
  title?: string
  /** API version shown in the Swagger UI (default: '1.0.0') */
  version?: string
}

export interface AdminConfig {
  /** Enable static admin serving (default true when omitted) */
  enabled?: boolean
  /** Path to serve admin UI (default: '/admin') */
  path?: string
  /** Custom path to admin dist folder */
  distPath?: string
}

export class MagnetModuleOptions {
  db: DBConfig
  jwt: {
    secret: string
  }
  /**
   * Auth configuration (optional, uses JWT by default)
   */
  auth?: AuthConfig
  internationalization?: InternationalizationOptions
  playground?: PlaygroundOptions
  storage?: StorageConfig
  /**
   * Email adapter configuration
   * @example
   * email: { adapter: 'nodemailer', nodemailer: { host: 'smtp.example.com', port: 587, auth: { user: 'user', pass: 'pass' } } }
   */
  email?: EmailConfig
  /**
   * Plugins to load with the Magnet module
   */
  plugins?: PluginConfig[]
  /**
   * Admin panel configuration (enabled by default when omitted).
   * @example
   * // Explicit enable (same as omitting `admin`)
   * admin: true
   *
   * // Custom path
   * admin: { enabled: true, path: '/dashboard' }
   *
   * // Disable (for API-only mode)
   * admin: false
   */
  admin?: boolean | AdminConfig
  /**
   * RBAC (Role-Based Access Control) configuration
   * @example
   * rbac: { enabled: true, defaultRole: 'authenticated' }
   */
  rbac?: RBACModuleOptions

  /**
   * Vault configuration for encrypted secrets management.
   * Uses the built-in DB adapter by default (requires VAULT_MASTER_KEY env var).
   * @example
   * vault: { adapter: 'db' }
   * vault: { adapter: 'hashicorp', hashicorp: { url: 'https://vault.example.com:8200' } }
   */
  vault?: VaultConfig

  constructor({
    db,
    jwt,
    auth,
    internationalization,
    playground,
    storage,
    email,
    plugins,
    admin,
    rbac,
    vault,
  }: MagnetModuleOptions) {
    this.db = db
    this.jwt = jwt
    this.auth = auth
    this.internationalization = internationalization
    this.playground = playground
    this.storage = storage
    this.email = email
    this.plugins = plugins
    this.admin = admin
    this.rbac = rbac
    this.vault = vault
  }
}

export type MagnetModuleOptionsAsync = {
  useFactory: (...args: unknown[]) => Promise<MagnetModuleOptions> | MagnetModuleOptions
  inject?: Type[]
  imports?: Type[]
}
