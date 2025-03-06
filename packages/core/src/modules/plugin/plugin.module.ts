import { DynamicModule, Module, Provider, Type } from '@nestjs/common'
import { DiscoveryModule } from '@nestjs/core'
import { PLUGIN_METADATA } from './constants'
import { PluginService } from './plugin.service'
import { PluginMetadata, PluginOptions } from './types'

@Module({
	imports: [DiscoveryModule],
	providers: [PluginService],
	exports: [PluginService],
})
export class PluginModule {
	static forRoot(options: PluginOptions = { plugins: [] }): DynamicModule {
		const pluginProviders = PluginModule.createPluginProviders(options.plugins)

		return {
			module: PluginModule,
			global: true,
			imports: [DiscoveryModule],
			providers: [
				PluginService,
				...pluginProviders,
				{
					provide: 'PLUGIN_OPTIONS',
					useValue: options,
				},
			],
			exports: [PluginService, ...pluginProviders],
		}
	}

	private static createPluginProviders(plugins: Type[]): Provider[] {
		return plugins.map((plugin) => {
			const metadata = Reflect.getMetadata(
				PLUGIN_METADATA,
				plugin,
			) as PluginMetadata

			if (!metadata) {
				throw new Error(`Plugin ${plugin.name} is missing @Plugin() decorator`)
			}

			return {
				provide: `PLUGIN_${plugin.name}`,
				useClass: plugin,
			}
		})
	}
}
