import { Toaster } from '@magnet-cms/ui/components/atoms'
import { names } from '@magnet-cms/utils'
import { useQueryClient } from '@tanstack/react-query'
import React, { Suspense } from 'react'
import {
	Navigate,
	Outlet,
	Route,
	Routes,
	useNavigate,
	useParams,
} from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { toast } from 'sonner'

import { Loader } from '~/components/Loader'
import { AdminProvider } from '~/contexts/useAdmin'
import {
	PluginRegistryProvider,
	usePluginRegistry,
} from '~/core/plugins/PluginRegistry'
import { AUTH_STATUS_KEY, useLogin, useRegister } from '~/hooks/useAuth'
import { useSettingData, useSettingMutation } from '~/hooks/useSetting'
import { useAppIntl } from '~/i18n'
import { PrivateRoute } from './PrivateRoute'
import { PublicRoute } from './PublicRoute'

import { AuthLayout } from '~/features/auth/shared'
// Import layouts
import { AuthedLayout } from '~/layouts/AuthedLayout'

import {
	AccessControlListingPage,
	AccessControlPage,
} from '~/features/access-control'
import { ActivityPage } from '~/features/activity'
import { ApiKeysListingPage } from '~/features/api-keys'
import { LoginForm } from '~/features/auth/login'
import { OAuthCallbackPage } from '~/features/auth/oauth-callback'
import { SignupForm } from '~/features/auth/register'
import { SetupForm } from '~/features/auth/setup'
import type { SetupFormValues } from '~/features/auth/setup'
import {
	ContentManagerHomePage,
	ContentManagerListingPage,
	SchemaFormPage,
} from '~/features/content-manager'
// Import feature pages
import { DashboardHome } from '~/features/dashboard'
import {
	EmailTemplateEditorPage,
	EmailTemplatesListingPage,
} from '~/features/email-templates'
import { MediaLibraryPage } from '~/features/media-library'
import { ProfilePage, SettingsPage } from '~/features/settings'
import { UsersListingPage } from '~/features/users'
import { VaultPage } from '~/features/vault'
import { WebhooksListingPage } from '~/features/webhooks'

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
					toast.error(
						error.message ||
							'Failed to sign in. Please check your credentials.',
					)
				},
			},
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
					navigate('/setup')
				},
				onError: (error) => {
					if (error.message?.toLowerCase().includes('check your email')) {
						toast.success(
							'Account created! Please check your email to confirm your account.',
						)
						navigate('/auth')
					} else {
						toast.error(
							error.message || 'Failed to create account. Please try again.',
						)
					}
				},
			},
		)
	}

	return <SignupForm onSubmit={handleSubmit} isLoading={isPending} />
}

/**
 * SetupPage wrapper — collects initial project settings after signup.
 * Saves to the 'general' settings group via the settings API.
 */
function SetupPage() {
	const navigate = useNavigate()
	const intl = useAppIntl()
	const queryClient = useQueryClient()
	const { data: generalSettings } =
		useSettingData<Record<string, unknown>>('general')
	const { mutate: saveSettings, isPending } =
		useSettingMutation<Record<string, unknown>>('general')

	const handleSubmit = (data: SetupFormValues) => {
		// Build payload: only include baseUrl if non-empty
		const payload: Record<string, unknown> = {
			siteName: data.siteName,
			defaultLocale: data.defaultLocale,
			timezone: data.timezone,
		}
		if (data.baseUrl) {
			payload.baseUrl = `https://${data.baseUrl}`
		}
		saveSettings(payload, {
			onSuccess: () => {
				toast.success(
					intl.formatMessage({
						id: 'auth.setup.successMessage',
						defaultMessage: 'Project configured successfully!',
					}),
				)
				// Invalidate auth status so PrivateRoute gets fresh onboardingCompleted value
				queryClient.invalidateQueries({ queryKey: AUTH_STATUS_KEY })
				navigate('/')
			},
			onError: (err) => {
				toast.error(err.message || 'Failed to save settings')
			},
		})
	}

	const handleSkip = () => {
		sessionStorage.setItem('magnet_onboarding_skipped', 'true')
		navigate('/')
	}

	// Strip https:// prefix from saved baseUrl for the text input
	const savedBaseUrl = ((generalSettings?.baseUrl as string) ?? '').replace(
		/^https?:\/\//,
		'',
	)

	return (
		<SetupForm
			onSubmit={handleSubmit}
			onSkip={handleSkip}
			isLoading={isPending}
			defaultValues={{
				siteName: (generalSettings?.siteName as string) ?? 'Magnet CMS',
				baseUrl: savedBaseUrl,
				defaultLocale: (generalSettings?.defaultLocale as string) ?? 'en',
				timezone: (generalSettings?.timezone as string) ?? 'utc',
			}}
		/>
	)
}

/**
 * Wrapper for ContentManagerListingPage that extracts params
 */
function ContentManagerListingPageWrapper() {
	const { schema = '' } = useParams<{ schema: string }>()
	const schemaNames = names(schema)
	return (
		<ContentManagerListingPage
			schema={schema}
			schemaDisplayName={schemaNames.title}
		/>
	)
}

/**
 * Wrapper for SchemaFormPage that extracts params
 */
function SchemaFormPageWrapper() {
	const { schema = '', id = '' } = useParams<{ schema: string; id: string }>()
	const schemaNames = names(schema)
	return (
		<SchemaFormPage
			schema={schema}
			schemaDisplayName={schemaNames.title}
			entryId={id}
		/>
	)
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

	return (
		<AuthedLayout>
			<Outlet />
		</AuthedLayout>
	)
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
				path: '',
				element: withSuspense(ContentManagerHomePage),
			},
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
		path: 'activity',
		element: withSuspense(ActivityPage),
	},
	{
		path: 'api-keys',
		element: withSuspense(ApiKeysListingPage),
	},
	{
		path: 'vault',
		element: withSuspense(VaultPage),
	},
	{
		path: 'webhooks',
		element: withSuspense(WebhooksListingPage),
	},
	{
		path: 'email-templates',
		element: <Outlet />,
		children: [
			{
				path: '',
				element: withSuspense(EmailTemplatesListingPage),
			},
			{
				path: 'new',
				element: withSuspense(EmailTemplateEditorPage),
			},
			{
				path: ':id',
				element: withSuspense(EmailTemplateEditorPage),
			},
		],
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
				path: '/auth',
				element: <PublicRoute />,
				children: [
					{
						element: <AuthLayoutWrapper />,
						children: [{ path: '', element: <LoginPage /> }],
					},
				],
			},
			{
				// OAuth callback: NestJS backend redirects here with tokens in query params
				path: '/auth/callback',
				element: <OAuthCallbackPage />,
			},
			{
				path: '/login',
				element: <Navigate to="/auth" replace />,
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
				path: '/setup',
				element: <PrivateRoute />,
				children: [
					{
						element: <AuthLayoutWrapper />,
						children: [{ path: '', element: <SetupPage /> }],
					},
				],
			},
			{
				path: '/account',
				element: <Navigate to="/settings/profile" replace />,
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
