import type {
	PluginConfig,
	PluginFrontendManifest,
	PluginMetadata,
	RegisteredPluginInfo,
} from '@magnet/common'
import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common'
import { ModulesContainer } from '@nestjs/core'
import { PLUGIN_FRONTEND_MANIFEST, PLUGIN_METADATA } from './constants'

interface RegisteredPlugin {
	metadata: PluginMetadata
	instance: unknown
	frontendManifest?: PluginFrontendManifest
	config: PluginConfig
}

@Injectable()
export class PluginRegistryService implements OnModuleInit {
	private plugins: Map<string, RegisteredPlugin> = new Map()

	constructor(
		private readonly modulesContainer: ModulesContainer,
		@Optional()
		@Inject('MAGNET_PLUGINS_CONFIG')
		private readonly pluginsConfig: PluginConfig[] = [],
	) {}

	onModuleInit() {
		this.discoverPlugins()
	}

	private discoverPlugins() {
		// Use the plugin configs directly since they already have the plugin classes
		for (const config of this.pluginsConfig) {
			const PluginClass = config.plugin

			const metadata = Reflect.getMetadata(
				PLUGIN_METADATA,
				PluginClass,
			) as PluginMetadata

			if (!metadata) {
				console.warn(
					`Plugin ${PluginClass.name} is missing @Plugin() decorator, skipping`,
				)
				continue
			}

			const frontendManifest = Reflect.getMetadata(
				PLUGIN_FRONTEND_MANIFEST,
				PluginClass,
			) as PluginFrontendManifest | undefined

			// Find the provider instance by looking up the provider token
			const providerToken = `PLUGIN_${metadata.name}`
			let instance: unknown = null

			for (const module of this.modulesContainer.values()) {
				const provider = module.providers.get(providerToken)
				if (provider?.instance) {
					instance = provider.instance
					break
				}
			}

			this.plugins.set(metadata.name, {
				metadata,
				instance,
				frontendManifest,
				config,
			})
		}
	}

	/**
	 * Get a registered plugin by name
	 */
	getPlugin(name: string): RegisteredPlugin | undefined {
		return this.plugins.get(name)
	}

	/**
	 * Get all registered plugins
	 */
	getAllPlugins(): RegisteredPlugin[] {
		return Array.from(this.plugins.values())
	}

	/**
	 * Get metadata for all plugins
	 */
	getPluginMetadata(): PluginMetadata[] {
		return this.getAllPlugins().map((p) => p.metadata)
	}

	/**
	 * Get frontend manifests for all plugins
	 */
	getFrontendManifests(): PluginFrontendManifest[] {
		return this.getAllPlugins()
			.filter((p) => p.frontendManifest)
			.map((p) => p.frontendManifest as PluginFrontendManifest)
	}

	/**
	 * Get full plugin info for API response
	 */
	getPluginInfo(name: string): RegisteredPluginInfo | null {
		const plugin = this.plugins.get(name)
		if (!plugin) return null

		return {
			name: plugin.metadata.name,
			description: plugin.metadata.description,
			version: plugin.metadata.version,
			dependencies: plugin.metadata.dependencies,
			frontend: plugin.frontendManifest,
			options: plugin.config.options,
		}
	}

	/**
	 * Get all plugins info for API response
	 */
	getAllPluginsInfo(): RegisteredPluginInfo[] {
		return this.getAllPlugins().map((plugin) => ({
			name: plugin.metadata.name,
			description: plugin.metadata.description,
			version: plugin.metadata.version,
			dependencies: plugin.metadata.dependencies,
			frontend: plugin.frontendManifest,
			options: plugin.config.options,
		}))
	}
}
