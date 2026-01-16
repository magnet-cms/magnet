import type { PluginFrontendManifest, PluginMetadata } from '@magnet-cms/common'
import type { Type } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import {
	PLUGIN_FRONTEND_MANIFEST,
	PLUGIN_METADATA,
	PLUGIN_MODULE,
} from '../constants'

export interface PluginDecoratorOptions extends Omit<PluginMetadata, 'module'> {
	/** Frontend manifest for this plugin */
	frontend?: Omit<PluginFrontendManifest, 'pluginName'>
	/** NestJS module containing controllers/services (auto-imported) */
	module?: Type<unknown>
}

/**
 * Decorator to mark a class as a Magnet plugin
 *
 * @example
 * ```ts
 * @Plugin({
 *   name: 'content-builder',
 *   description: 'Visual schema builder',
 *   version: '1.0.0',
 *   frontend: {
 *     routes: [{ path: 'playground', componentId: 'PlaygroundIndex' }],
 *     sidebar: [{ id: 'playground', title: 'Playground', url: '/playground', icon: 'Boxes' }]
 *   }
 * })
 * export class ContentBuilderPlugin {}
 * ```
 */
export function Plugin(options: PluginDecoratorOptions): ClassDecorator {
	return (target: Function) => {
		// Apply Injectable decorator so the plugin can be used as a NestJS provider
		Injectable()(target)

		const metadata: PluginMetadata = {
			name: options.name,
			description: options.description,
			version: options.version,
			dependencies: options.dependencies,
		}

		Reflect.defineMetadata(PLUGIN_METADATA, metadata, target)

		if (options.frontend) {
			const frontendManifest: PluginFrontendManifest = {
				...options.frontend,
				pluginName: options.name,
			}
			Reflect.defineMetadata(PLUGIN_FRONTEND_MANIFEST, frontendManifest, target)
		}

		// Store the module reference if provided
		if (options.module) {
			Reflect.defineMetadata(PLUGIN_MODULE, options.module, target)
		}
	}
}
