import { useQuery } from '@tanstack/react-query'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
	type ComponentType,
	type ReactNode,
	Suspense,
	createContext,
	lazy,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import type { RouteObject } from 'react-router-dom'
import { useAdapter } from '../provider/MagnetProvider'
import type {
	FrontendPluginManifest,
	PluginRegistrationFn,
	PluginRouteDefinition,
	PluginSidebarItem,
	ResolvedPlugin,
	ResolvedSidebarItem,
} from './types'

// ============================================================================
// Global Plugin Registrations (build-time)
// ============================================================================

const pluginRegistrations: PluginRegistrationFn[] = []
let resolvedPluginsCache: Map<string, ResolvedPlugin> | null = null

/**
 * Register a plugin at build time.
 * Called by plugin packages in their frontend/index.ts
 *
 * @example
 * ```ts
 * // In @magnet/plugin-content-builder/frontend/index.ts
 * import { registerMagnetPlugin } from '@magnet/admin'
 *
 * registerMagnetPlugin(() => ({
 *   manifest: {
 *     pluginName: 'content-builder',
 *     routes: [{ path: 'playground', componentId: 'PlaygroundIndex' }],
 *     sidebar: [{ id: 'playground', title: 'Playground', url: '/playground', icon: 'Boxes' }]
 *   },
 *   components: {
 *     PlaygroundIndex: () => import('./pages/Playground'),
 *   }
 * }))
 * ```
 */
export function registerMagnetPlugin(registration: PluginRegistrationFn): void {
	pluginRegistrations.push(registration)
	// Invalidate cache when new plugin is registered
	resolvedPluginsCache = null
}

/**
 * Get all registered plugin routes synchronously.
 * Used for static route definitions.
 */
export function getRegisteredPluginRoutes(): RouteObject[] {
	if (!resolvedPluginsCache) {
		resolvedPluginsCache = new Map()
		for (const registration of pluginRegistrations) {
			try {
				const { manifest, components } = registration()
				const resolved = resolvePlugin(manifest, components)
				resolvedPluginsCache.set(manifest.pluginName, resolved)
			} catch (err) {
				console.error('Failed to resolve plugin:', err)
			}
		}
	}
	return Array.from(resolvedPluginsCache.values()).flatMap((p) => p.routes)
}

// ============================================================================
// Context
// ============================================================================

interface PluginRegistryContextValue {
	plugins: Map<string, ResolvedPlugin>
	isLoading: boolean
	error: Error | null
	registerPlugin: (registration: PluginRegistrationFn) => void
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

	// Fetch plugin manifests from backend
	const {
		data: manifests,
		isLoading,
		error,
	} = useQuery<FrontendPluginManifest[]>({
		queryKey: ['plugins', 'manifests'],
		queryFn: () => adapter.request('/plugins/manifests'),
		staleTime: Number.POSITIVE_INFINITY, // Manifests don't change during session
	})

	// Process build-time registered plugins and backend manifests
	useEffect(() => {
		const resolvedPlugins = new Map<string, ResolvedPlugin>()

		// Process build-time registrations
		for (const registration of pluginRegistrations) {
			try {
				const { manifest, components } = registration()
				const resolved = resolvePlugin(manifest, components)
				resolvedPlugins.set(manifest.pluginName, resolved)
			} catch (err) {
				console.error('Failed to register plugin:', err)
			}
		}

		// Merge with backend manifests (backend takes precedence for metadata)
		if (manifests) {
			for (const manifest of manifests) {
				const existing = resolvedPlugins.get(manifest.pluginName)
				if (existing) {
					// Update metadata from backend
					existing.manifest = { ...existing.manifest, ...manifest }
				}
				// Note: If no build-time registration, plugin is backend-only (no UI)
			}
		}

		setPlugins(resolvedPlugins)
	}, [manifests])

	const registerPlugin = (registration: PluginRegistrationFn) => {
		try {
			const { manifest, components } = registration()
			const resolved = resolvePlugin(manifest, components)
			setPlugins((prev) => new Map(prev).set(manifest.pluginName, resolved))
		} catch (err) {
			console.error('Failed to register plugin:', err)
		}
	}

	const getPluginRoutes = (): RouteObject[] => {
		return Array.from(plugins.values()).flatMap((p) => p.routes)
	}

	const getSidebarItems = (): ResolvedSidebarItem[] => {
		return Array.from(plugins.values())
			.flatMap((p) => p.sidebarItems)
			.sort((a, b) => a.order - b.order)
	}

	const contextValue = useMemo<PluginRegistryContextValue>(
		() => ({
			plugins,
			isLoading,
			error: error as Error | null,
			registerPlugin,
			getPluginRoutes,
			getSidebarItems,
		}),
		[plugins, isLoading, error],
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
 */
function resolveRoute(
	routeDef: PluginRouteDefinition,
	components: Map<string, React.LazyExoticComponent<ComponentType<unknown>>>,
): RouteObject {
	const Component = components.get(routeDef.componentId)

	return {
		path: routeDef.path,
		element: Component ? (
			<Suspense fallback={<div className="p-4">Loading...</div>}>
				<Component />
			</Suspense>
		) : null,
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
	const Icon =
		(LucideIcons as Record<string, LucideIcon>)[item.icon] || LucideIcons.Puzzle

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
