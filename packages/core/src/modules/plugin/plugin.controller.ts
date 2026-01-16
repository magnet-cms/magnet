import { Controller, Get, Param } from '@nestjs/common'
import { RestrictedRoute } from '~/decorators/restricted.route'
import { PluginRegistryService } from './plugin-registry.service'

@Controller('plugins')
@RestrictedRoute()
export class PluginController {
	constructor(private readonly registry: PluginRegistryService) {}

	/**
	 * Get all registered plugins
	 * GET /plugins
	 */
	@Get()
	getPlugins() {
		return this.registry.getAllPluginsInfo()
	}

	/**
	 * Get all frontend manifests for registered plugins
	 * Used by admin UI to discover plugin routes and sidebar items
	 * GET /plugins/manifests
	 */
	@Get('manifests')
	getFrontendManifests() {
		return this.registry.getFrontendManifests()
	}

	/**
	 * Get plugin details by name
	 * GET /plugins/:name
	 */
	@Get(':name')
	getPlugin(@Param('name') name: string) {
		const plugin = this.registry.getPluginInfo(name)
		if (!plugin) {
			return { error: 'Plugin not found' }
		}
		return plugin
	}
}
