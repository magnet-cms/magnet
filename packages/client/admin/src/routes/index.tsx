import { Toaster } from '@magnet-cms/ui/components'
import React, { Suspense } from 'react'
import { Outlet, Route, Routes } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'

import { Loader } from '~/components/Loader'
import { AdminProvider } from '~/contexts/useAdmin'
import {
	PluginRegistryProvider,
	usePluginRegistry,
} from '~/core/plugins/PluginRegistry'
import { PrivateRoute } from './PrivateRoute'
import { PublicRoute } from './PublicRoute'

import { AuthLayout } from '../layouts/AuthLayout'
import { DashboardLayout } from '../layouts/DashboardLayout'

import AccountPage from '~/pages/Account'
import Auth from '~/pages/Auth'
import ContentManager from '~/pages/ContentManager'
import ContentManagerItem from '~/pages/ContentManager/Item'
import ContentManagerList from '~/pages/ContentManager/Item/List'
import ContentManagerViewer from '~/pages/ContentManager/Item/Viewer'
import ContentManagerViewerAPI from '~/pages/ContentManager/Item/Viewer/API'
import ContentManagerViewerEdit from '~/pages/ContentManager/Item/Viewer/Edit'
import ContentManagerViewerLivePreview from '~/pages/ContentManager/Item/Viewer/LivePreview'
import ContentManagerViewerVersions from '~/pages/ContentManager/Item/Viewer/Versions'
import HomePage from '~/pages/Home'
import MediaLibrary from '~/pages/Media'
import MediaDetail from '~/pages/Media/Detail'
import NotFound from '~/pages/NotFound'
import Settings from '~/pages/Settings'
import SettingsEdit from '~/pages/Settings/Edit'

const withSuspense = (Component: React.ComponentType<unknown>) => (
	<Suspense fallback={<Loader />}>
		<Component />
	</Suspense>
)

/**
 * Root layout that provides AdminProvider, PluginRegistryProvider and Toaster to all routes
 */
const RootLayout = () => (
	<AdminProvider>
		<PluginRegistryProvider>
			<Outlet />
			<Toaster />
		</PluginRegistryProvider>
	</AdminProvider>
)

/**
 * Core dashboard routes (content manager, settings, account)
 */
const coreDashboardRoutes = [
	{ path: '', element: withSuspense(HomePage) },
	{
		path: 'content-manager',
		element: <Outlet />,
		children: [
			{
				path: '',
				element: <ContentManager />,
			},
			{
				path: ':schema',
				element: <ContentManagerItem />,
				children: [
					{
						path: '',
						element: <ContentManagerList />,
					},
					{
						path: ':id',
						element: <ContentManagerViewer />,
						children: [
							{
								path: '',
								element: <ContentManagerViewerEdit />,
							},
							{
								path: 'live-preview',
								element: <ContentManagerViewerLivePreview />,
							},
							{
								path: 'versions',
								element: <ContentManagerViewerVersions />,
							},
							{
								path: 'api',
								element: <ContentManagerViewerAPI />,
							},
						],
					},
				],
			},
		],
	},
	{
		path: 'settings',
		element: <Outlet />,
		children: [
			{
				path: '',
				element: <Settings />,
			},
			{
				path: ':group',
				element: <SettingsEdit />,
			},
		],
	},
	{
		path: 'media',
		element: <Outlet />,
		children: [
			{
				path: '',
				element: <MediaLibrary />,
			},
			{
				path: ':id',
				element: <MediaDetail />,
			},
		],
	},
	{
		path: 'account',
		element: <AccountPage />,
	},
]

/**
 * Dashboard content wrapper that waits for plugins and renders routes
 */
function DashboardContent() {
	const { isLoading } = usePluginRegistry()

	if (isLoading) {
		return <Loader />
	}

	return <DashboardLayout />
}

/**
 * Recursively render route and its children
 */
function renderRoute(route: RouteObject, index: number): React.ReactNode {
	return (
		<Route key={index} path={route.path} element={route.element}>
			{route.children?.map((child, childIndex) =>
				renderRoute(child, childIndex),
			)}
		</Route>
	)
}

/**
 * Plugin route handler - renders plugin routes using Routes component
 */
function PluginRouteHandler() {
	const { getPluginRoutes, isLoading } = usePluginRegistry()

	if (isLoading) {
		return <Loader />
	}

	const pluginRoutes = getPluginRoutes()

	if (pluginRoutes.length === 0) {
		return <NotFound />
	}

	// Render all plugin routes using Routes component
	return (
		<Routes>
			{pluginRoutes.map((route, index) => renderRoute(route, index))}
			<Route path="*" element={<NotFound />} />
		</Routes>
	)
}

export const routes: RouteObject[] = [
	{
		element: <RootLayout />,
		children: [
			{
				path: '/',
				element: <PrivateRoute />,
				children: [
					{
						element: <DashboardContent />,
						children: [
							...coreDashboardRoutes,
							// Catch-all for plugin routes
							{
								path: '*',
								element: <PluginRouteHandler />,
							},
						],
					},
				],
			},
			{
				path: '/auth',
				element: <PublicRoute />,
				children: [
					{
						path: '',
						element: <AuthLayout />,
						children: [{ path: '', element: <Auth /> }],
					},
				],
			},
			{
				path: '*',
				element: <NotFound />,
			},
		],
	},
]

export const getBasePath = (): string => {
	return (import.meta as any).env?.BASE_URL || ''
}

export const normalizePath = (path: string): string => {
	return path.startsWith('/') ? path : `/${path}`
}
