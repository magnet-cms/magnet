export const PLUGIN_METADATA = 'plugin:metadata'
export const PLUGIN_FRONTEND_MANIFEST = 'plugin:frontend:manifest'
export const PLUGIN_MODULE = 'plugin:module'

/**
 * Generate standardized options token for a plugin.
 *
 * @param pluginName - The plugin name (e.g., 'playground')
 * @returns Token string (e.g., 'PLUGIN_PLAYGROUND_OPTIONS')
 *
 * @example
 * ```ts
 * getPluginOptionsToken('playground') // 'PLUGIN_PLAYGROUND_OPTIONS'
 * ```
 */
export function getPluginOptionsToken(pluginName: string): string {
  const normalized = pluginName.toUpperCase().replace(/-/g, '_')
  return `PLUGIN_${normalized}_OPTIONS`
}
