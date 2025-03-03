// src/router.tsx
import React from 'react'
import { Outlet, createBrowserRouter } from 'react-router-dom'

// Define types for our components and routes
interface RouteComponent {
	default: React.ComponentType<any>
}

interface RouteDefinition {
	path: string
	element: React.ReactElement
	children?: RouteDefinition[]
}

// Use Vite's import.meta.glob to dynamically import all page components
const pages = import.meta.glob<RouteComponent>('./pages/**/*.tsx', {
	eager: true,
})
const layouts = import.meta.glob<RouteComponent>('./pages/**/layout.tsx', {
	eager: true,
})

// Function to generate routes from page files with layout support
const generateRoutes = (): RouteDefinition[] => {
	const routes: RouteDefinition[] = []
	const routesByDirectory: Record<string, RouteDefinition[]> = {}

	// First, identify and create all the layout wrapper routes
	for (const layoutPath in layouts) {
		const directory = layoutPath.replace('/layout.tsx', '')
		const Layout = layouts[layoutPath]?.default // Add optional chaining to handle undefined

		routesByDirectory[directory] = []

		// Create a parent route with the layout
		const parentRoute: RouteDefinition = {
			path: '',
			element: Layout
				? React.createElement(Layout, null, React.createElement(Outlet))
				: React.createElement('div'),
			children: routesByDirectory[directory],
		}

		// Find the parent directory to nest this layout
		const parentDir = directory.split('/').slice(0, -1).join('/')
		if (parentDir in routesByDirectory && routesByDirectory[parentDir]) {
			routesByDirectory[parentDir].push(parentRoute)
		} else {
			routes.push(parentRoute)
		}
	}

	// Now add all pages to their respective directories or to the root routes
	for (const pagePath in pages) {
		// Skip layout files as they're handled separately
		if (pagePath.endsWith('/layout.tsx')) continue

		// Extract route path from file path
		// e.g., './pages/Home.tsx' becomes '/home'
		// e.g., './pages/users/Profile.tsx' becomes '/users/profile'
		let routePath = pagePath
			.replace('./pages', '')
			.replace(/\.tsx$/, '')
			.replace(/\/index$/, '') // '/index' routes become just '/'
			.toLowerCase()

		// Make sure the path starts with / for root routes
		if (!routePath.startsWith('/')) {
			routePath = `/${routePath}`
		}

		const route: RouteDefinition = {
			path: routePath === '/home' ? '/' : routePath,
			element: pages[pagePath]?.default
				? React.createElement(pages[pagePath].default)
				: React.createElement('div'), // Use empty div instead of null
		}

		// Determine which directory this page belongs to
		const pageDirectory = `./pages${pagePath.substring(0, pagePath.lastIndexOf('/')).replace('./pages', '')}`

		// If the directory has a layout, add this page as a child route
		if (pageDirectory in routesByDirectory) {
			// Extract just the filename for the nested route
			const filename = pagePath.split('/').pop()?.replace('.tsx', '') || ''
			// For index files, use empty string as path (default route)
			const childPath = filename === 'index' ? '' : filename.toLowerCase()

			if (pages[pagePath]?.default) {
				routesByDirectory[pageDirectory]?.push({
					path: childPath,
					element: React.createElement(pages[pagePath].default),
				})
			}
		} else {
			// No layout for this directory, add as a root route
			routes.push(route)
		}
	}

	return routes
}

const basePath = import.meta.env.BASE_URL

// Create the router with dynamic routes
const router = createBrowserRouter(generateRoutes(), {
	basename: basePath,
})

export default router
