import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
	type ComponentType,
	type ReactNode,
	Suspense,
	createContext,
	lazy,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import type { RouteObject } from 'react-router-dom'
import { useAdapter } from '../provider/MagnetProvider'
import { exposePluginGlobals } from './globals'
import {
	getRegisteredPlugins,
	initPluginRegistry,
	loadPluginBundles,
} from './loader'
import type {
	EnrichedPluginManifest,
	FrontendPluginManifest,
	PluginRegistrationFn,
	PluginRouteDefinition,
	PluginSidebarItem,
	ResolvedPlugin,
	ResolvedSidebarItem,
} from './types'

// ============================================================================
// Runtime Plugin Loading
// ============================================================================

/**
 * @deprecated Use runtime plugin loading instead.
 * Plugins now self-register via window.__MAGNET_PLUGINS__
 */
export function registerMagnetPlugin(registration: PluginRegistrationFn): void {
	initPluginRegistry()
	const { manifest, components } = registration()
	window.__MAGNET_PLUGINS__?.push({ manifest, components })
}

/**
 * @deprecated Use usePluginRoutes() hook inside PluginRegistryProvider instead.
 * This function is kept for backwards compatibility but returns an empty array.
 */
export function getRegisteredPluginRoutes(): RouteObject[] {
	// Routes are now resolved dynamically at runtime
	// This function is deprecated - use usePluginRoutes() inside the provider
	return []
}

// ============================================================================
// Context
// ============================================================================

interface PluginRegistryContextValue {
	plugins: Map<string, ResolvedPlugin>
	isLoading: boolean
	error: Error | null
	getPluginRoutes: () => RouteObject[]
	getSidebarItems: () => ResolvedSidebarItem[]
}

const PluginRegistryContext = createContext<PluginRegistryContextValue | null>(
	null,
)

// ============================================================================
// Provider
// ============================================================================

interface PluginRegistryProviderProps {
	children: ReactNode
}

export function PluginRegistryProvider({
	children,
}: PluginRegistryProviderProps) {
	const adapter = useAdapter()
	const [plugins, setPlugins] = useState<Map<string, ResolvedPlugin>>(new Map())
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	// Load plugins at runtime
	useEffect(() => {
		async function loadPlugins() {
			try {
				// Expose shared dependencies as globals for plugin bundles
				exposePluginGlobals()

				// Initialize the global plugin registry
				initPluginRegistry()

				// 1. Fetch manifests from backend (includes bundleUrls)
				const manifests: EnrichedPluginManifest[] =
					await adapter.request('/plugins/manifests')

				console.log('[Magnet] Plugin manifests:', manifests)

				// 2. Load each plugin bundle
				const bundleUrls = manifests
					.filter((m) => m.bundleUrl)
					.map((m) => m.bundleUrl)

				if (bundleUrls.length > 0) {
					await loadPluginBundles(bundleUrls)
				}

				// 3. Collect registered plugins from window.__MAGNET_PLUGINS__
				const registrations = getRegisteredPlugins()
				console.log('[Magnet] Registered plugins:', registrations)

				// 4. Resolve routes and components
				const resolvedPlugins = new Map<string, ResolvedPlugin>()

				for (const registration of registrations) {
					try {
						const resolved = resolvePlugin(
							registration.manifest,
							registration.components,
						)
						resolvedPlugins.set(registration.manifest.pluginName, resolved)
					} catch (err) {
						console.error(
							`[Magnet] Failed to resolve plugin ${registration.manifest.pluginName}:`,
							err,
						)
					}
				}

				setPlugins(resolvedPlugins)
			} catch (err) {
				console.error('[Magnet] Failed to load plugins:', err)
				setError(
					err instanceof Error ? err : new Error('Failed to load plugins'),
				)
			} finally {
				setIsLoading(false)
			}
		}

		loadPlugins()
	}, [adapter])

	const getPluginRoutes = useCallback((): RouteObject[] => {
		return Array.from(plugins.values()).flatMap((p) => p.routes)
	}, [plugins])

	const getSidebarItems = useCallback((): ResolvedSidebarItem[] => {
		return Array.from(plugins.values())
			.flatMap((p) => p.sidebarItems)
			.sort((a, b) => a.order - b.order)
	}, [plugins])

	const contextValue = useMemo<PluginRegistryContextValue>(
		() => ({
			plugins,
			isLoading,
			error,
			getPluginRoutes,
			getSidebarItems,
		}),
		[plugins, isLoading, error, getPluginRoutes, getSidebarItems],
	)

	return (
		<PluginRegistryContext.Provider value={contextValue}>
			{children}
		</PluginRegistryContext.Provider>
	)
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to access the plugin registry
 */
export function usePluginRegistry(): PluginRegistryContextValue {
	const context = useContext(PluginRegistryContext)
	if (!context) {
		throw new Error(
			'usePluginRegistry must be used within PluginRegistryProvider',
		)
	}
	return context
}

/**
 * Hook to get all plugin routes
 */
export function usePluginRoutes(): RouteObject[] {
	return usePluginRegistry().getPluginRoutes()
}

/**
 * Hook to get all plugin sidebar items
 */
export function usePluginSidebarItems(): ResolvedSidebarItem[] {
	return usePluginRegistry().getSidebarItems()
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Resolve a plugin manifest into routes and components
 */
function resolvePlugin(
	manifest: FrontendPluginManifest,
	components: Record<
		string,
		() => Promise<{ default: ComponentType<unknown> }>
	>,
): ResolvedPlugin {
	const componentMap = new Map(
		Object.entries(components).map(([id, loader]) => [id, lazy(loader)]),
	)

	const routes = (manifest.routes || []).map((routeDef) =>
		resolveRoute(routeDef, componentMap),
	)

	const sidebarItems = (manifest.sidebar || []).map((item) =>
		resolveSidebarItem(item),
	)

	return {
		manifest,
		components: componentMap,
		routes,
		sidebarItems,
	}
}

/**
 * Resolve a route definition into a React Router route object
 *
 * If a route has children, we don't set element on the parent
 * (the child with path: '' acts as the index route).
 * This is because React Router requires parent elements to render <Outlet />
 * for children to appear.
 */
function resolveRoute(
	routeDef: PluginRouteDefinition,
	components: Map<string, React.LazyExoticComponent<ComponentType<unknown>>>,
): RouteObject {
	const Component = components.get(routeDef.componentId)
	const hasChildren = routeDef.children && routeDef.children.length > 0

	// If route has children, don't set element on parent
	// The index child (path: '') will handle the default view
	const element =
		Component && !hasChildren ? (
			<Suspense fallback={<div className="p-4">Loading...</div>}>
				<Component />
			</Suspense>
		) : null

	return {
		path: routeDef.path,
		element,
		children: routeDef.children?.map((child) =>
			resolveRoute(child, components),
		),
	}
}

/**
 * Resolve a sidebar item definition
 */
function resolveSidebarItem(item: PluginSidebarItem): ResolvedSidebarItem {
	// Resolve icon from lucide-react
	// Cast through unknown since LucideIcons contains both icons and helper utilities
	const iconMap = LucideIcons as unknown as Record<string, LucideIcon | undefined>
	const Icon = iconMap[item.icon] ?? LucideIcons.Puzzle

	return {
		id: item.id,
		title: item.title,
		url: item.url,
		icon: Icon,
		order: item.order ?? 50,
		items: item.items?.map(resolveSidebarItem),
		badge: item.badge,
	}
}
