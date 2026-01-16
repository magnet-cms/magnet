/**
 * Content Builder Plugin - Frontend Entry
 *
 * This file registers the plugin's frontend components with the admin UI.
 * Import this file in your admin entry point to enable the plugin:
 *
 * @example
 * ```ts
 * import '@magnet/plugin-content-builder/frontend'
 * ```
 */

import { registerMagnetPlugin } from '@magnet/admin'
import type { FrontendPluginManifest } from '@magnet/admin'

/**
 * Plugin manifest defining routes and sidebar items
 */
const manifest: FrontendPluginManifest = {
	pluginName: 'content-builder',
	routes: [
		{
			path: 'playground',
			componentId: 'PlaygroundIndex',
			children: [
				{ path: '', componentId: 'PlaygroundIndex' },
				{ path: 'new', componentId: 'PlaygroundEditor' },
				{ path: ':schemaName', componentId: 'PlaygroundEditor' },
			],
		},
	],
	sidebar: [
		{
			id: 'playground',
			title: 'Playground',
			url: '/playground',
			icon: 'Boxes',
			order: 20,
		},
	],
}

/**
 * Component loaders for lazy loading
 */
const components = {
	PlaygroundIndex: () => import('./pages/Playground'),
	PlaygroundEditor: () => import('./pages/Playground/Editor'),
}

// Register the plugin with the admin UI
registerMagnetPlugin(() => ({
	manifest,
	components,
}))
