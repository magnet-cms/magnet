import type { PluginConfig, PluginModuleOptions } from '@magnet/common'
import type { Type } from '@nestjs/common'
import { DynamicModule, Module, Provider } from '@nestjs/common'
import { DiscoveryModule } from '@nestjs/core'
import { PLUGIN_METADATA } from './constants'
import { PluginRegistryService } from './plugin-registry.service'
import { PluginController } from './plugin.controller'
import { PluginService } from './plugin.service'
import type { PluginMetadata } from './types'

/**
 * @deprecated Use PluginModuleOptions instead
 */
interface PluginOptions {
	plugins: Type[]
}

@Module({
	imports: [DiscoveryModule],
	providers: [PluginService, PluginRegistryService],
	controllers: [PluginController],
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

		return {
			module: PluginModule,
			global: true,
			imports: [DiscoveryModule],
			controllers: [PluginController],
			providers: [
				PluginService,
				PluginRegistryService,
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
			exports: [PluginService, PluginRegistryService, ...pluginProviders],
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

	private static createPluginProviders(plugins: PluginConfig[]): Provider[] {
		return plugins.map((config) => {
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

			return {
				provide: `PLUGIN_${metadata.name}`,
				useFactory: () => new PluginClass(),
			}
		})
	}
}
