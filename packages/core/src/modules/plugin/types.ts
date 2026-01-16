import type { Type } from '@nestjs/common'

// Re-export types from @magnet/common for backward compatibility
export type {
	PluginConfig,
	PluginFrontendManifest,
	PluginHook,
	PluginMetadata,
	PluginModuleOptions,
	PluginRouteDefinition,
	PluginSettingsPage,
	PluginSidebarItem,
	RegisteredPluginInfo,
} from '@magnet/common'

/**
 * @deprecated Use PluginModuleOptions from @magnet/common instead
 */
export type PluginOptions = {
	plugins: Type[]
}
