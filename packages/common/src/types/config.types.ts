import { Type } from '@nestjs/common'
import type { AuthConfig } from './auth.types'
import { DBConfig } from './database.types'
import type { PluginConfig } from './plugin.types'
import type { RBACModuleOptions } from './rbac.types'
import { StorageConfig } from './storage.types'

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

export interface AdminConfig {
	/** Enable static admin serving (default: false) */
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
	 * Plugins to load with the Magnet module
	 */
	plugins?: PluginConfig[]
	/**
	 * Admin panel configuration
	 * @example
	 * // Enable with defaults
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

	constructor({
		db,
		jwt,
		auth,
		internationalization,
		playground,
		storage,
		plugins,
		admin,
		rbac,
	}: MagnetModuleOptions) {
		this.db = db
		this.jwt = jwt
		this.auth = auth
		this.internationalization = internationalization
		this.playground = playground
		this.storage = storage
		this.plugins = plugins
		this.admin = admin
		this.rbac = rbac
	}
}

export type MagnetModuleOptionsAsync = {
	useFactory: (
		...args: unknown[]
	) => Promise<MagnetModuleOptions> | MagnetModuleOptions
	inject?: Type[]
	imports?: Type[]
}
