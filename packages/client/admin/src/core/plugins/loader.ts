import type { ComponentType } from 'react'
import type { FrontendPluginManifest } from './types'

/**
 * Registration data provided by self-registering plugins
 */
export interface PluginRegistration {
	manifest: FrontendPluginManifest
	components: Record<string, () => Promise<{ default: ComponentType<unknown> }>>
}

// Extend window to include plugin registry
declare global {
	interface Window {
		__MAGNET_PLUGINS__?: PluginRegistration[]
	}
}

/**
 * Load a plugin bundle by injecting a script tag
 * The plugin will self-register on window.__MAGNET_PLUGINS__
 */
export async function loadPluginBundle(bundleUrl: string): Promise<void> {
	return new Promise((resolve, reject) => {
		// Check if script is already loaded
		const existingScript = document.querySelector(`script[src="${bundleUrl}"]`)
		if (existingScript) {
			resolve()
			return
		}

		const script = document.createElement('script')
		script.src = bundleUrl
		script.type = 'text/javascript'
		script.async = true

		script.onload = () => {
			console.log(`[Magnet] Loaded plugin bundle: ${bundleUrl}`)
			resolve()
		}

		script.onerror = () => {
			console.error(`[Magnet] Failed to load plugin bundle: ${bundleUrl}`)
			reject(new Error(`Failed to load plugin bundle: ${bundleUrl}`))
		}

		document.head.appendChild(script)
	})
}

/**
 * Load multiple plugin bundles in sequence
 */
export async function loadPluginBundles(bundleUrls: string[]): Promise<void> {
	for (const url of bundleUrls) {
		try {
			await loadPluginBundle(url)
		} catch (error) {
			// Log error but continue loading other plugins
			console.error('[Magnet] Plugin load error:', error)
		}
	}
}

/**
 * Get all plugins that have registered themselves on the window
 */
export function getRegisteredPlugins(): PluginRegistration[] {
	return window.__MAGNET_PLUGINS__ || []
}

/**
 * Initialize the plugin registry on the window
 */
export function initPluginRegistry(): void {
	if (!window.__MAGNET_PLUGINS__) {
		window.__MAGNET_PLUGINS__ = []
	}
}
