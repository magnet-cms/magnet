/**
 * Playground plugin — frontend entry
 *
 * This file automatically registers the plugin when loaded via script injection.
 * The admin app loads plugin bundles at runtime and plugins self-register
 * on window.__MAGNET_PLUGINS__.
 */

import type { ComponentType } from 'react'

/**
 * Plugin manifest type (inline to avoid import issues in UMD bundle)
 */
interface FrontendPluginManifest {
	pluginName: string
	routes?: {
		path: string
		componentId: string
		children?: { path: string; componentId: string }[]
	}[]
	sidebar?: {
		id: string
		title: string
		url: string
		icon: string
		order?: number
	}[]
}

/**
 * Plugin registration type
 */
interface PluginRegistration {
	manifest: FrontendPluginManifest
	components: Record<string, () => Promise<{ default: ComponentType<unknown> }>>
}

// Extend window for plugin registry
declare global {
	interface Window {
		__MAGNET_PLUGINS__?: PluginRegistration[]
	}
}

/**
 * Plugin manifest defining routes and sidebar items
 */
const manifest: FrontendPluginManifest = {
	pluginName: 'playground',
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
const components: Record<
	string,
	() => Promise<{ default: ComponentType<unknown> }>
> = {
	PlaygroundIndex: () => import('./pages/Playground'),
	PlaygroundEditor: () => import('./pages/Playground/Editor'),
}

/**
 * Self-register the plugin when the script is loaded
 */
function registerPlugin() {
	// Initialize registry if needed
	if (!window.__MAGNET_PLUGINS__) {
		window.__MAGNET_PLUGINS__ = []
	}

	// Check if already registered
	const alreadyRegistered = window.__MAGNET_PLUGINS__.some(
		(p) => p.manifest.pluginName === manifest.pluginName,
	)

	if (!alreadyRegistered) {
		window.__MAGNET_PLUGINS__.push({ manifest, components })
		console.log(`[Magnet] Plugin registered: ${manifest.pluginName}`)
	}
}

// Auto-register on load
registerPlugin()

/**
 * For `createMagnetAdmin({ plugins: [playgroundPlugin] })` (optional; admin usually loads the IIFE at runtime).
 */
export const playgroundPlugin = () => ({ manifest, components })
export default playgroundPlugin
