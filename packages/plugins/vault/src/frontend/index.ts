/**
 * Vault Plugin - Frontend Entry
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
	pluginName: 'vault',
	routes: [
		{
			path: 'vault',
			componentId: 'VaultSettings',
			children: [{ path: '', componentId: 'VaultSettings' }],
		},
	],
	sidebar: [
		{
			id: 'vault',
			title: 'Vault',
			url: '/vault',
			icon: 'KeyRound',
			order: 90,
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
	VaultSettings: () => import('./pages/VaultSettings'),
}

/**
 * Self-register the plugin when the script is loaded
 */
function registerPlugin() {
	if (!window.__MAGNET_PLUGINS__) {
		window.__MAGNET_PLUGINS__ = []
	}

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

export const vaultPlugin = () => ({ manifest, components })
export default vaultPlugin
