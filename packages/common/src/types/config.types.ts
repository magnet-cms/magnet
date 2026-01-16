import { Type } from '@nestjs/common'
import { DBConfig } from './database.types'
import type { PluginConfig } from './plugin.types'
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

export class MagnetModuleOptions {
	db: DBConfig
	jwt: {
		secret: string
	}
	internationalization?: InternationalizationOptions
	playground?: PlaygroundOptions
	storage?: StorageConfig
	/**
	 * Plugins to load with the Magnet module
	 */
	plugins?: PluginConfig[]

	constructor({
		db,
		jwt,
		internationalization,
		playground,
		storage,
		plugins,
	}: MagnetModuleOptions) {
		this.db = db
		this.jwt = jwt
		this.internationalization = internationalization
		this.playground = playground
		this.storage = storage
		this.plugins = plugins
	}
}

export type MagnetModuleOptionsAsync = {
	useFactory: (
		...args: any[]
	) => Promise<MagnetModuleOptions> | MagnetModuleOptions
	inject?: Type[]
	imports?: Type[]
}
