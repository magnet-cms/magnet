import type {
	PluginConfig,
	PluginMetadata,
	PluginModuleOptions,
} from '@magnet-cms/common'
import type { Type } from '@nestjs/common'
import { DynamicModule, Module, Provider } from '@nestjs/common'
import { DiscoveryModule } from '@nestjs/core'
import {
	PLUGIN_METADATA,
	PLUGIN_MODULE,
	getPluginOptionsToken,
} from './constants'
import { PluginAssetsController } from './plugin-assets.controller'
import { PluginLifecycleService } from './plugin-lifecycle.service'
import { PluginRegistryService } from './plugin-registry.service'
import { PluginController } from './plugin.controller'
import { PluginService } from './plugin.service'

/**
 * @deprecated Use PluginModuleOptions instead
 */
interface PluginOptions {
	plugins: Type[]
}

@Module({
	imports: [DiscoveryModule],
	providers: [PluginService, PluginRegistryService],
	controllers: [PluginController, PluginAssetsController],
	exports: [PluginService, PluginRegistryService],
})
export class PluginModule {
	/**
	 * Configure the plugin module with plugin configurations
	 *
	 * @example
	 * ```ts
	 * PluginModule.forRoot({
	 *   plugins: [
	 *     { plugin: ContentBuilderPlugin, options: { modulesPath: './src/modules' } },
	 *     { plugin: SeoPlugin, enabled: true }
	 *   ]
	 * })
	 * ```
	 */
	static forRoot(
		options: PluginModuleOptions = { plugins: [] },
	): DynamicModule {
		const enabledPlugins = options.plugins.filter((p) => p.enabled !== false)
		const pluginProviders = PluginModule.createPluginProviders(enabledPlugins)
		const pluginModules = PluginModule.collectPluginModules(enabledPlugins)

		return {
			module: PluginModule,
			global: true,
			imports: [DiscoveryModule, ...pluginModules],
			controllers: [PluginController, PluginAssetsController],
			providers: [
				PluginService,
				PluginRegistryService,
				PluginLifecycleService,
				...pluginProviders,
				{
					provide: 'PLUGIN_OPTIONS',
					useValue: { plugins: enabledPlugins.map((p) => p.plugin) },
				},
				{
					provide: 'MAGNET_PLUGINS_CONFIG',
					useValue: enabledPlugins,
				},
			],
			exports: [
				PluginService,
				PluginRegistryService,
				PluginLifecycleService,
				...pluginProviders,
			],
		}
	}

	/**
	 * @deprecated Use forRoot with PluginConfig[] instead
	 */
	static forRootLegacy(
		options: PluginOptions = { plugins: [] },
	): DynamicModule {
		const pluginConfigs: PluginConfig[] = options.plugins.map((plugin) => ({
			plugin,
		}))
		return PluginModule.forRoot({ plugins: pluginConfigs })
	}

	/**
	 * Collect NestJS modules from plugins that define them
	 */
	private static collectPluginModules(
		plugins: PluginConfig[],
	): Type<unknown>[] {
		const modules: Type<unknown>[] = []

		for (const config of plugins) {
			const PluginClass = config.plugin
			const pluginModule = Reflect.getMetadata(PLUGIN_MODULE, PluginClass) as
				| Type<unknown>
				| undefined

			if (pluginModule) {
				modules.push(pluginModule)
			}
		}

		return modules
	}

	private static createPluginProviders(plugins: PluginConfig[]): Provider[] {
		const providers: Provider[] = []

		for (const config of plugins) {
			const PluginClass = config.plugin
			const metadata = Reflect.getMetadata(
				PLUGIN_METADATA,
				PluginClass,
			) as PluginMetadata

			if (!metadata) {
				throw new Error(
					`Plugin ${PluginClass.name} is missing @Plugin() decorator`,
				)
			}

			// Plugin instance provider
			providers.push({
				provide: `PLUGIN_${metadata.name}`,
				useFactory: () => new PluginClass(),
			})

			// Plugin options provider (standardized token)
			const optionsToken = getPluginOptionsToken(metadata.name)
			providers.push({
				provide: optionsToken,
				useValue: config.options || {},
			})

			// Also provide with legacy token for backwards compatibility
			// e.g., 'CONTENT_BUILDER_OPTIONS' for 'content-builder' plugin
			const legacyToken = `${metadata.name.toUpperCase().replace(/-/g, '_')}_OPTIONS`
			providers.push({
				provide: legacyToken,
				useValue: config.options || {},
			})
		}

		return providers
	}
}
