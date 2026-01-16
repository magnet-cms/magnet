import type { QueryClient } from '@tanstack/react-query'
import type {
	MagnetApiAdapter,
	MagnetConfig,
	RouterType,
	TokenStorage,
} from './core/adapters/types'
import { MagnetProvider } from './core/provider/MagnetProvider'
import { MagnetRouter } from './core/router/MagnetRouter'
import { routes } from './routes/index.tsx'

export interface MagnetAdminProps {
	/**
	 * API Configuration - either provide a custom adapter or apiBaseUrl
	 * If neither is provided, defaults to 'http://localhost:3000'
	 */
	apiAdapter?: MagnetApiAdapter

	/**
	 * Base URL for the API (used with default HTTP adapter)
	 * @default 'http://localhost:3000'
	 */
	apiBaseUrl?: string

	/**
	 * Token storage implementation
	 * - Defaults to localStorage in browser environments
	 * - Use createMemoryStorage() for SSR
	 * - Use createCookieStorage() for Next.js
	 */
	tokenStorage?: TokenStorage

	/**
	 * Router type
	 * - 'browser': Standard browser history (default, for standalone apps)
	 * - 'memory': In-memory router (for embedding in apps that control the URL)
	 * - 'hash': Hash-based router (for static hosting)
	 */
	router?: RouterType

	/**
	 * Base path for the admin UI
	 * @example '/admin' if admin is mounted at /admin
	 */
	basePath?: string

	/**
	 * Custom QueryClient instance
	 * Provide this if you want to share the query client with other parts of your app
	 */
	queryClient?: QueryClient

	/**
	 * Feature flags to enable/disable parts of the admin
	 */
	features?: {
		auth?: boolean
		contentManager?: boolean
		settings?: boolean
	}

	/**
	 * Callback when user is unauthorized (401 response)
	 * By default, redirects to /auth
	 */
	onUnauthorized?: () => void

	/**
	 * Callback for handling errors
	 */
	onError?: (error: Error) => void

	/**
	 * Initial entries for memory router (only used when router='memory')
	 */
	initialEntries?: string[]
}

/**
 * MagnetAdmin - The main admin panel component
 *
 * This is the primary way to use the Magnet admin UI. It provides a fully
 * configured admin panel that can be embedded in any React application.
 *
 * @example
 * // Simplest usage - NestJS standalone
 * import { MagnetAdmin } from '@magnet-cms/admin'
 *
 * function App() {
 *   return <MagnetAdmin />
 * }
 *
 * @example
 * // With custom API URL
 * import { MagnetAdmin } from '@magnet-cms/admin'
 *
 * function App() {
 *   return (
 *     <MagnetAdmin
 *       apiBaseUrl="https://api.example.com"
 *       basePath="/admin"
 *     />
 *   )
 * }
 *
 * @example
 * // In Next.js with cookie storage
 * import { MagnetAdmin, createCookieStorage } from '@magnet-cms/admin'
 *
 * export default function AdminPage() {
 *   return (
 *     <MagnetAdmin
 *       apiBaseUrl={process.env.NEXT_PUBLIC_API_URL}
 *       tokenStorage={createCookieStorage({ path: '/admin' })}
 *       basePath="/admin"
 *     />
 *   )
 * }
 *
 * @example
 * // Embedded in existing app (memory router)
 * import { MagnetAdmin } from '@magnet-cms/admin'
 *
 * function AdminSection() {
 *   return (
 *     <MagnetAdmin
 *       router="memory"
 *       initialEntries={['/content-manager']}
 *     />
 *   )
 * }
 *
 * @example
 * // With custom adapter (GraphQL, tRPC, etc.)
 * import { MagnetAdmin } from '@magnet-cms/admin'
 * import { myGraphQLAdapter } from './adapters/graphql'
 *
 * function App() {
 *   return <MagnetAdmin apiAdapter={myGraphQLAdapter} />
 * }
 */
export function MagnetAdmin({
	apiAdapter,
	apiBaseUrl = 'http://localhost:3000',
	tokenStorage,
	router = 'browser',
	basePath,
	queryClient,
	features,
	onUnauthorized,
	onError,
	initialEntries = ['/'],
}: MagnetAdminProps) {
	const config: MagnetConfig = {
		apiAdapter,
		apiBaseUrl,
		tokenStorage,
		basePath,
		queryClient,
		features,
		onUnauthorized,
		onError,
	}

	return (
		<MagnetProvider config={config}>
			<MagnetRouter
				type={router}
				basePath={basePath}
				routes={routes}
				initialEntries={initialEntries}
			/>
		</MagnetProvider>
	)
}

export default MagnetAdmin
