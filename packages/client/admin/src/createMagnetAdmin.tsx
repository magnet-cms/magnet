import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import App from './App'
import { registerMagnetPlugin } from './core/plugins'
import type { PluginRegistrationFn } from './core/plugins'

export interface MagnetAdminConfig {
	/**
	 * Array of plugin registration functions
	 * Each plugin should export a registration function from its frontend entry
	 *
	 * @example
	 * ```ts
	 * import { contentBuilderPlugin } from '@magnet-cms/plugin-content-builder/frontend'
	 *
	 * createMagnetAdmin({
	 *   plugins: [contentBuilderPlugin]
	 * })
	 * ```
	 */
	plugins?: PluginRegistrationFn[]

	/**
	 * Root element ID (defaults to 'root')
	 */
	rootElement?: string
}

/**
 * Create and mount a Magnet Admin instance with configured plugins
 *
 * This is the main entry point for consumer apps that want to customize
 * which plugins are included in their admin panel.
 *
 * @example
 * ```ts
 * // apps/my-app/admin/entry.ts
 * import { createMagnetAdmin } from '@magnet-cms/admin'
 * import { contentBuilderPlugin } from '@magnet-cms/plugin-content-builder/frontend'
 * import { seoPlugin } from '@magnet-cms/plugin-seo/frontend'
 *
 * createMagnetAdmin({
 *   plugins: [contentBuilderPlugin, seoPlugin]
 * })
 * ```
 */
export function createMagnetAdmin(config: MagnetAdminConfig = {}): void {
	const { plugins = [], rootElement = 'root' } = config

	// Register all plugins before mounting
	for (const plugin of plugins) {
		registerMagnetPlugin(plugin)
	}

	const root = document.getElementById(rootElement)
	if (!root) {
		throw new Error(`Root element "${rootElement}" not found`)
	}

	ReactDOM.createRoot(root).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
	)
}

/**
 * Default export for simple usage
 */
export default createMagnetAdmin
