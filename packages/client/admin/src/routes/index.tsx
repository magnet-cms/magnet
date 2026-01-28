import { Toaster } from '@magnet-cms/ui/components/atoms'
import { names } from '@magnet-cms/utils'
import React, { Suspense } from 'react'
import { Outlet, Route, Routes, useParams, useNavigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { toast } from 'sonner'

import { Loader } from '~/components/Loader'
import { AdminProvider } from '~/contexts/useAdmin'
import {
	PluginRegistryProvider,
	usePluginRegistry,
} from '~/core/plugins/PluginRegistry'
import { PrivateRoute } from './PrivateRoute'
import { PublicRoute } from './PublicRoute'
import { useLogin, useRegister } from '~/hooks/useAuth'

// Import layouts
import { AuthedLayout } from '~/layouts/AuthedLayout'
import { AuthLayout } from '~/features/auth/shared'

// Import feature pages
import { DashboardHome } from '~/features/dashboard'
import { ContentManagerListingPage, SchemaFormPage } from '~/features/content-manager'
import { MediaLibraryPage } from '~/features/media-library'
import { UsersListingPage } from '~/features/users'
import { AccessControlListingPage, AccessControlPage } from '~/features/access-control'
import { ApiKeysListingPage } from '~/features/api-keys'
import { SettingsPage, ProfilePage } from '~/features/settings'
import { PlaygroundPage } from '~/features/playground'
import { LoginForm } from '~/features/auth/login'
import { SignupForm } from '~/features/auth/register'
import { ProfileSetupForm } from '~/features/auth/profile-setup'

// ============================================================================
// Auth Page Wrappers
// ============================================================================

interface LoginFormValues {
	email: string
	password: string
	rememberMe?: boolean
}

/**
 * LoginPage wrapper that connects LoginForm to useLogin hook
 */
function LoginPage() {
	const { mutate: login, isPending } = useLogin()
	const navigate = useNavigate()

	const handleSubmit = (data: LoginFormValues) => {
		login(
			{ email: data.email, password: data.password },
			{
				onSuccess: () => {
					toast.success('Welcome back!')
					navigate('/')
				},
				onError: (error) => {
					toast.error(error.message || 'Failed to sign in. Please check your credentials.')
				},
			}
		)
	}

	return <LoginForm onSubmit={handleSubmit} isLoading={isPending} />
}

interface SignupFormValues {
	firstName: string
	lastName: string
	email: string
	password: string
}

/**
 * SignupPage wrapper that connects SignupForm to useRegister hook
 */
function SignupPage() {
	const { mutate: register, isPending } = useRegister()
	const navigate = useNavigate()

	const handleSubmit = (data: SignupFormValues) => {
		register(
			{
				email: data.email,
				password: data.password,
				name: `${data.firstName} ${data.lastName}`.trim(),
				role: 'authenticated', // Default role for new signups
			},
			{
				onSuccess: () => {
					toast.success('Account created successfully!')
					navigate('/profile-setup')
				},
				onError: (error) => {
					toast.error(error.message || 'Failed to create account. Please try again.')
				},
			}
		)
	}

	return <SignupForm onSubmit={handleSubmit} isLoading={isPending} />
}

interface ProfileSetupFormValues {
	displayName: string
	username: string
	location?: string
}

/**
 * ProfileSetupPage wrapper that handles profile setup
 */
function ProfileSetupPage() {
	const navigate = useNavigate()
	// TODO: Wire to useUpdateProfile when profile setup API is available
	const isLoading = false

	const handleSubmit = (data: ProfileSetupFormValues) => {
		// For now, just navigate to dashboard
		// This will be wired to useUpdateProfile in Phase 5
		console.log('Profile setup data:', data)
		toast.success('Profile setup complete!')
		navigate('/')
	}

	return <ProfileSetupForm onSubmit={handleSubmit} isLoading={isLoading} />
}

/**
 * Wrapper for ContentManagerListingPage that extracts params
 */
function ContentManagerListingPageWrapper() {
	const { schema = '' } = useParams<{ schema: string }>()
	const schemaNames = names(schema)
	return <ContentManagerListingPage schema={schema} schemaDisplayName={schemaNames.title} />
}

/**
 * Wrapper for SchemaFormPage that extracts params
 */
function SchemaFormPageWrapper() {
	const { schema = '', id = '' } = useParams<{ schema: string; id: string }>()
	const schemaNames = names(schema)
	return <SchemaFormPage schema={schema} schemaDisplayName={schemaNames.title} entryId={id} />
}

const withSuspense = (Component: React.ComponentType) => (
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
 * Dashboard content wrapper that waits for plugins and renders routes
 */
function DashboardContent() {
	const { isLoading } = usePluginRegistry()

	if (isLoading) {
		return <Loader />
	}

	return <AuthedLayout><Outlet /></AuthedLayout>
}

/**
 * Core dashboard routes
 */
const coreDashboardRoutes: RouteObject[] = [
	{ path: '', element: withSuspense(DashboardHome) },
	{
		path: 'content-manager',
		element: <Outlet />,
		children: [
			{
				path: ':schema',
				element: withSuspense(ContentManagerListingPageWrapper),
			},
			{
				path: ':schema/:id',
				element: withSuspense(SchemaFormPageWrapper),
			},
			{
				path: ':schema/:id/versions',
				element: withSuspense(SchemaFormPageWrapper),
			},
			{
				path: ':schema/:id/api',
				element: withSuspense(SchemaFormPageWrapper),
			},
		],
	},
	{
		path: 'media-library',
		element: withSuspense(MediaLibraryPage),
	},
	{
		path: 'users',
		element: withSuspense(UsersListingPage),
	},
	{
		path: 'access-control',
		element: <Outlet />,
		children: [
			{
				path: '',
				element: withSuspense(AccessControlListingPage),
			},
			{
				path: ':role',
				element: withSuspense(AccessControlPage),
			},
		],
	},
	{
		path: 'api-keys',
		element: withSuspense(ApiKeysListingPage),
	},
	{
		path: 'settings',
		element: <Outlet />,
		children: [
			{
				path: '',
				element: withSuspense(SettingsPage),
			},
			{
				path: 'profile',
				element: withSuspense(ProfilePage),
			},
			{
				path: ':group',
				element: withSuspense(SettingsPage),
			},
		],
	},
	{
		path: 'playground',
		element: withSuspense(PlaygroundPage),
	},
]

/**
 * Not found page component
 */
function NotFound() {
	return (
		<div className="flex items-center justify-center h-screen">
			<div className="text-center">
				<h1 className="text-4xl font-bold mb-4">404</h1>
				<p className="text-muted-foreground">Page not found</p>
			</div>
		</div>
	)
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

/**
 * AuthLayout wrapper that provides children via Outlet
 */
function AuthLayoutWrapper() {
	return (
		<AuthLayout>
			<Outlet />
		</AuthLayout>
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
				path: '/login',
				element: <PublicRoute />,
				children: [
					{
						element: <AuthLayoutWrapper />,
						children: [{ path: '', element: <LoginPage /> }],
					},
				],
			},
			{
				path: '/signup',
				element: <PublicRoute />,
				children: [
					{
						element: <AuthLayoutWrapper />,
						children: [{ path: '', element: <SignupPage /> }],
					},
				],
			},
			{
				path: '/profile-setup',
				element: <PrivateRoute />,
				children: [
					{
						element: <AuthLayoutWrapper />,
						children: [{ path: '', element: <ProfileSetupPage /> }],
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
	return (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || ''
}

export const normalizePath = (path: string): string => {
	return path.startsWith('/') ? path : `/${path}`
}
