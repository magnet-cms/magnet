import type { Type } from '@nestjs/common'

// Re-export types from @magnet-cms/common for backward compatibility
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
} from '@magnet-cms/common'

/**
 * @deprecated Use PluginModuleOptions from @magnet-cms/common instead
 */
export type PluginOptions = {
	plugins: Type[]
}
