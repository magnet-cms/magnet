import type {
	PluginConfig,
	PluginLifecycle,
	PluginMetadata,
} from '@magnet-cms/common'
import {
	Inject,
	Injectable,
	Logger,
	OnApplicationShutdown,
	OnModuleInit,
	Optional,
} from '@nestjs/common'
import { ModulesContainer } from '@nestjs/core'
import { PLUGIN_METADATA } from './constants'

/**
 * Service that manages plugin lifecycle hooks.
 * Calls onPluginInit() after module initialization and onPluginDestroy() on shutdown.
 */
@Injectable()
export class PluginLifecycleService
	implements OnModuleInit, OnApplicationShutdown
{
	private readonly logger = new Logger(PluginLifecycleService.name)
	private pluginInstances: Map<string, PluginLifecycle> = new Map()

	constructor(
		private readonly modulesContainer: ModulesContainer,
		@Optional()
		@Inject('MAGNET_PLUGINS_CONFIG')
		private readonly pluginsConfig: PluginConfig[] = [],
	) {}

	async onModuleInit() {
		// Collect plugin instances
		for (const config of this.pluginsConfig) {
			const PluginClass = config.plugin
			const metadata = Reflect.getMetadata(
				PLUGIN_METADATA,
				PluginClass,
			) as PluginMetadata

			if (!metadata) continue

			const providerToken = `PLUGIN_${metadata.name}`

			for (const module of this.modulesContainer.values()) {
				const provider = module.providers.get(providerToken)
				if (provider?.instance) {
					this.pluginInstances.set(
						metadata.name,
						provider.instance as PluginLifecycle,
					)
					break
				}
			}
		}

		// Call onPluginInit for all plugins
		for (const [name, instance] of this.pluginInstances) {
			if (typeof instance.onPluginInit === 'function') {
				try {
					await instance.onPluginInit()
					this.logger.log(`Plugin "${name}" initialized`)
				} catch (error) {
					this.logger.error(
						`Error in onPluginInit for plugin "${name}":`,
						error,
					)
				}
			}
		}
	}

	async onApplicationShutdown() {
		// Call onPluginDestroy for all plugins
		for (const [name, instance] of this.pluginInstances) {
			if (typeof instance.onPluginDestroy === 'function') {
				try {
					await instance.onPluginDestroy()
					this.logger.log(`Plugin "${name}" destroyed`)
				} catch (error) {
					this.logger.error(
						`Error in onPluginDestroy for plugin "${name}":`,
						error,
					)
				}
			}
		}
	}
}
