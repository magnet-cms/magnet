import { useMemo } from 'react'
import {
	RouterProvider,
	createBrowserRouter,
	createHashRouter,
	createMemoryRouter,
} from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import type { RouterType } from '../adapters/types'

export interface MagnetRouterProps {
	/**
	 * The type of router to use
	 * - 'browser': Standard browser history (default, for standalone apps)
	 * - 'memory': In-memory router (for embedding in apps that control the URL)
	 * - 'hash': Hash-based router (for static hosting without server config)
	 */
	type?: RouterType

	/**
	 * Base path for the router
	 * e.g., '/admin' if admin is mounted at /admin
	 */
	basePath?: string

	/**
	 * Route configuration
	 */
	routes: RouteObject[]

	/**
	 * Initial entries for memory router (only used when type='memory')
	 */
	initialEntries?: string[]

	/**
	 * Initial index for memory router (only used when type='memory')
	 */
	initialIndex?: number
}

/**
 * MagnetRouter - A flexible router wrapper that supports multiple router types
 *
 * This component abstracts the router creation to allow the admin UI to be
 * embedded in different environments:
 * - Standalone: Use 'browser' router (default)
 * - Embedded in Next.js/other SPA: Use 'memory' router
 * - Static hosting: Use 'hash' router
 *
 * @example
 * // Standalone usage (default)
 * <MagnetRouter routes={routes} basePath="/admin" />
 *
 * @example
 * // Embedded in an existing app
 * <MagnetRouter
 *   type="memory"
 *   routes={routes}
 *   initialEntries={['/content-manager']}
 * />
 *
 * @example
 * // Static hosting (GitHub Pages, etc.)
 * <MagnetRouter type="hash" routes={routes} />
 */
export function MagnetRouter({
	type = 'browser',
	basePath,
	routes,
	initialEntries = ['/'],
	initialIndex = 0,
}: MagnetRouterProps) {
	const router = useMemo(() => {
		switch (type) {
			case 'browser':
				return createBrowserRouter(routes, {
					basename: basePath,
				})
			case 'hash':
				return createHashRouter(routes, {
					basename: basePath,
				})
			case 'memory':
				return createMemoryRouter(routes, {
					initialEntries,
					initialIndex,
				})
			default:
				throw new Error(`Unknown router type: ${type}`)
		}
	}, [type, basePath, routes, initialEntries, initialIndex])

	return <RouterProvider router={router} />
}

export default MagnetRouter
