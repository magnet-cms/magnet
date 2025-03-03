import React, { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { Loader } from '~/components/Loader'
import { PrivateRoute } from './PrivateRoute'
import { PublicRoute } from './PublicRoute'

import { AuthLayout } from '../layouts/AuthLayout'
import { DashboardLayout } from '../layouts/DashboardLayout'

import Auth from '~/pages/Auth'
import ContentManager from '~/pages/ContentManager'
import ContentManagerEdit from '~/pages/ContentManager/Edit'
import ContentManagerList from '~/pages/ContentManager/List'
import HomePage from '~/pages/Home'
import NotFound from '~/pages/NotFound'
import Settings from '~/pages/Settings'
import SettingsEdit from '~/pages/Settings/Edit'

const withSuspense = (Component: React.ComponentType<any>) => (
	<Suspense fallback={<Loader />}>
		<Component />
	</Suspense>
)

export const routes = [
	{
		path: '/',
		element: <PrivateRoute />,
		children: [
			{
				path: '/',
				element: <DashboardLayout />,
				children: [
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
								element: withSuspense(ContentManagerList),
							},
							{
								path: ':schema/:slug',
								element: <ContentManagerEdit />,
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
]

export const getBasePath = (): string => {
	return (import.meta as any).env?.BASE_URL || ''
}

export const normalizePath = (path: string): string => {
	return path.startsWith('/') ? path : `/${path}`
}
