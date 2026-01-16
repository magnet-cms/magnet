/**
 * @magnet/admin - A flexible, decoupled admin UI for Magnet CMS
 *
 * This package provides a complete admin interface that can be:
 * - Used standalone with NestJS (default)
 * - Embedded in Next.js or other React applications
 * - Customized with your own API adapter
 *
 * @example
 * // Simplest usage
 * import { MagnetAdmin } from '@magnet/admin'
 * import '@magnet/admin/styles'
 *
 * function App() {
 *   return <MagnetAdmin apiBaseUrl="http://localhost:3000" />
 * }
 *
 * @example
 * // With Next.js
 * import { MagnetAdmin, createCookieStorage } from '@magnet/admin'
 * import '@magnet/admin/styles'
 *
 * export default function AdminPage() {
 *   return (
 *     <MagnetAdmin
 *       apiBaseUrl={process.env.NEXT_PUBLIC_API_URL}
 *       tokenStorage={createCookieStorage()}
 *       basePath="/admin"
 *     />
 *   )
 * }
 */

// =============================================================================
// Main Components
// =============================================================================

export { MagnetAdmin } from './MagnetAdmin'
export type { MagnetAdminProps } from './MagnetAdmin'

// =============================================================================
// Core Provider
// =============================================================================

export {
	MagnetProvider,
	useMagnet,
	useAdapter,
	useTokenStorage,
} from './core/provider/MagnetProvider'
export type { MagnetProviderProps } from './core/provider/MagnetProvider'

// =============================================================================
// Router
// =============================================================================

export { MagnetRouter } from './core/router/MagnetRouter'
export type { MagnetRouterProps } from './core/router/MagnetRouter'

// =============================================================================
// Adapters
// =============================================================================

export { createHttpAdapter } from './core/adapters/http-adapter'
export type { HttpAdapterConfig } from './core/adapters/http-adapter'

// =============================================================================
// Storage
// =============================================================================

export {
	createLocalStorage,
	createLegacyLocalStorage,
	LEGACY_TOKEN_KEY,
	LEGACY_REFRESH_TOKEN_KEY,
	LEGACY_TOKEN_EXPIRY_KEY,
} from './core/storage/localStorage'
export type { LocalStorageOptions } from './core/storage/localStorage'

export {
	createMemoryStorage,
	createMemoryStorageWithInitialValues,
} from './core/storage/memoryStorage'

export { createCookieStorage } from './core/storage/cookieStorage'
export type { CookieStorageOptions } from './core/storage/cookieStorage'

// =============================================================================
// Types
// =============================================================================

export type {
	// Config
	MagnetConfig,
	RouterType,
	// API Request/Response
	ApiRequestConfig,
	// Token Storage
	TokenStorage,
	// Main Adapter Interface
	MagnetApiAdapter,
	// Auth Types
	LoginCredentials,
	RegisterCredentials,
	AuthTokens,
	AuthUser,
	AuthStatus,
	// Discovery Types
	SchemaMetadata,
	ControllerMetadata,
	// History Types
	VersionInfo,
} from './core/adapters/types'

// =============================================================================
// Hooks - For building custom UIs
// =============================================================================

// Auth hooks
export {
	useLogin,
	useRegister,
	useRefreshToken,
	useMe,
	useStatus,
	useLogout,
	useAuth,
	AUTH_ME_KEY,
	AUTH_STATUS_KEY,
	AUTH_USER_KEY,
} from './hooks/useAuth'

// Discovery hooks
export {
	useSchemas,
	useSchema,
	useSettings,
	useSetting,
	useControllers,
	useController,
} from './hooks/useDiscovery'

// Content hooks
export { useContentList } from './hooks/useSchema'

// Settings data hook
export { useSettingData } from './hooks/useSetting'

// =============================================================================
// Context
// =============================================================================

export { AdminProvider, useAdmin } from './contexts/useAdmin'

// =============================================================================
// Components - For composition
// =============================================================================

export { FormBuilder } from './components/FormBuilder'
export { DashboardLayout } from './layouts/DashboardLayout'
export { AuthLayout } from './layouts/AuthLayout'
export { Loader } from './components/Loader'
export {
	PageHeader,
	PageContent,
	PageHeaderStatus,
	PageHeaderTabs,
} from './components/PageHeader'
export type {
	EditableTitleConfig,
	PageContentProps,
	PageHeaderProps,
	PageHeaderStatusProps,
	PageHeaderTabsProps,
	StatusBadge,
	StatusType,
	TabItem,
	TabsConfig,
	TitleConfig,
} from './components/PageHeader'

// =============================================================================
// Routes
// =============================================================================

export { routes, getBasePath, normalizePath } from './routes'

// =============================================================================
// Plugin System - For building plugins
// =============================================================================

export {
	registerMagnetPlugin,
	getRegisteredPluginRoutes,
	usePluginRegistry,
	usePluginRoutes,
	usePluginSidebarItems,
	PluginRegistryProvider,
} from './core/plugins'
export type {
	FrontendPluginManifest,
	PluginRegistrationFn,
	PluginRouteDefinition,
	PluginSidebarItem,
	ResolvedPlugin,
	ResolvedSidebarItem,
} from './core/plugins'
