import type { LucideIcon } from 'lucide-react'
import type { ComponentType, LazyExoticComponent } from 'react'
import type { RouteObject } from 'react-router-dom'

/**
 * Frontend plugin manifest (matches backend PluginFrontendManifest)
 */
export interface FrontendPluginManifest {
	pluginName: string
	routes?: PluginRouteDefinition[]
	sidebar?: PluginSidebarItem[]
	settings?: PluginSettingsPage[]
	permissions?: string[]
}

/**
 * Route definition for plugin
 */
export interface PluginRouteDefinition {
	path: string
	componentId: string
	requiresAuth?: boolean
	permissions?: string[]
	children?: PluginRouteDefinition[]
}

/**
 * Sidebar item for plugin
 */
export interface PluginSidebarItem {
	id: string
	title: string
	url: string
	icon: string
	order?: number
	items?: PluginSidebarItem[]
	badge?: string | number
}

/**
 * Settings page for plugin
 */
export interface PluginSettingsPage {
	groupId: string
	title: string
	description?: string
	componentId: string
}

/**
 * Resolved plugin with actual React components
 */
export interface ResolvedPlugin {
	manifest: FrontendPluginManifest
	components: Map<string, LazyExoticComponent<ComponentType<unknown>>>
	routes: RouteObject[]
	sidebarItems: ResolvedSidebarItem[]
}

/**
 * Resolved sidebar item with actual icon component
 */
export interface ResolvedSidebarItem {
	id: string
	title: string
	url: string
	icon: LucideIcon
	order: number
	items?: ResolvedSidebarItem[]
	badge?: string | number
}

/**
 * Plugin registration function type
 */
export type PluginRegistrationFn = () => {
	manifest: FrontendPluginManifest
	components: Record<string, () => Promise<{ default: ComponentType<unknown> }>>
}

/**
 * Plugin component loader type
 */
export type PluginComponentLoader = () => Promise<{
	default: ComponentType<unknown>
}>
