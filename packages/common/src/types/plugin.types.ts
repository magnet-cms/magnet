import type { Type } from '@nestjs/common'

/**
 * Plugin metadata for the @Plugin decorator
 */
export interface PluginMetadata {
  /** Unique plugin identifier (e.g., 'playground') */
  name: string
  /** Human-readable description */
  description?: string
  /** Semver version */
  version?: string
  /** Plugin dependencies (other plugin names) */
  dependencies?: string[]
  /** NestJS module to be auto-imported (optional for backwards compatibility) */
  module?: Type<unknown>
}

/**
 * Route definition for plugin frontend
 */
export interface PluginRouteDefinition {
  /** Route path (e.g., '/playground') */
  path: string
  /** Component identifier for lazy loading */
  componentId: string
  /** Whether route requires authentication */
  requiresAuth?: boolean
  /** Required permissions */
  permissions?: string[]
  /** Child routes */
  children?: PluginRouteDefinition[]
}

/**
 * Sidebar item for plugin frontend
 */
export interface PluginSidebarItem {
  /** Unique identifier */
  id: string
  /** Display title */
  title: string
  /** Route path */
  url: string
  /** Lucide icon name (e.g., 'Boxes', 'Settings') */
  icon: string
  /** Position in sidebar (lower = higher) */
  order?: number
  /** Child items */
  items?: PluginSidebarItem[]
  /** Badge to show */
  badge?: string | number
}

/**
 * Settings page for plugin
 */
export interface PluginSettingsPage {
  /** Settings group identifier */
  groupId: string
  /** Display title */
  title: string
  /** Description */
  description?: string
  /** Component identifier */
  componentId: string
}

/**
 * Frontend manifest exposed by plugins via discovery
 */
export interface PluginFrontendManifest {
  /** Plugin identifier */
  pluginName: string
  /** Routes to register */
  routes?: PluginRouteDefinition[]
  /** Sidebar items */
  sidebar?: PluginSidebarItem[]
  /** Settings pages */
  settings?: PluginSettingsPage[]
  /** Required permissions */
  permissions?: string[]
}

/**
 * Enriched plugin manifest with bundle URL for runtime loading
 * Returned by GET /plugins/manifests endpoint
 */
export interface EnrichedPluginManifest extends PluginFrontendManifest {
  /** URL to load the plugin's frontend bundle */
  bundleUrl: string
}

/**
 * Plugin configuration passed to MagnetModule.forRoot
 */
export interface PluginConfig {
  /** The plugin class decorated with @Plugin */
  plugin: Type<unknown>
  /** Plugin-specific options */
  options?: Record<string, unknown>
  /** Whether the plugin is enabled (default: true) */
  enabled?: boolean
}

/**
 * Hook definition for plugins
 */
export interface PluginHook {
  instance: unknown
  methodName: string | symbol
}

/**
 * Options for PluginModule.forRoot
 */
export interface PluginModuleOptions {
  plugins: PluginConfig[]
}

/**
 * Registered plugin info returned from API
 */
export interface RegisteredPluginInfo {
  name: string
  description?: string
  version?: string
  dependencies?: string[]
  frontend?: PluginFrontendManifest
  options?: Record<string, unknown>
}

/**
 * Interface for plugin lifecycle hooks.
 * Plugins can implement these methods to respond to lifecycle events.
 *
 * @example
 * ```ts
 * @Plugin({ name: 'my-plugin', module: MyPluginModule })
 * export class MyPlugin implements PluginLifecycle {
 *   onPluginInit() {
 *     console.log('Plugin initialized')
 *   }
 *
 *   onPluginDestroy() {
 *     console.log('Plugin destroyed')
 *   }
 * }
 * ```
 */
export interface PluginLifecycle {
  /**
   * Called after the plugin module is initialized.
   * Use this for plugin-specific setup that needs other services.
   */
  onPluginInit?(): void | Promise<void>

  /**
   * Called when the application is shutting down.
   * Use this for cleanup operations.
   */
  onPluginDestroy?(): void | Promise<void>
}
