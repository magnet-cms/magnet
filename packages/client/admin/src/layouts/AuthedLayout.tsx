'use client'

import type {
	HeaderConfig,
	SidebarConfig,
	UserMenuAction,
} from '@magnet-cms/ui/components/organisms/app-layout'
import { AppLayout } from '@magnet-cms/ui/components/organisms/app-layout'
import { names } from '@magnet-cms/utils'
import {
	Activity,
	Bell,
	Image,
	Key,
	KeyRound,
	Layers,
	LayoutDashboard,
	Mail,
	Settings,
	ShieldCheck,
	User,
	Users,
} from 'lucide-react'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { ThemeSwitcher } from '~/components/ThemeSwitcher'
import { usePluginSidebarItems } from '~/core/plugins/PluginRegistry'

import { NotificationsDrawer } from '~/features/notifications'
import { useAuth, useLogout } from '~/hooks/useAuth'
import { useSchemas } from '~/hooks/useDiscovery'
import { useUnreadNotificationCount } from '~/hooks/useNotifications'

interface AuthedLayoutProps {
	children: ReactNode
	/** Custom header configuration - allows pages to provide their own header content */
	header?: HeaderConfig
	/** Override default sidebar configuration */
	sidebar?: Partial<SidebarConfig>
}

export function AuthedLayout({ children, header, sidebar }: AuthedLayoutProps) {
	const [notificationsOpen, setNotificationsOpen] = useState(false)
	const location = useLocation()
	const navigate = useNavigate()

	// Auth hooks
	const { user, isLoading: isUserLoading } = useAuth()
	const logout = useLogout()

	// Notification badge count
	const { data: unreadData } = useUnreadNotificationCount()
	const unreadCount = unreadData?.count ?? 0

	// Get schemas for dynamic nav
	const { data: schemas } = useSchemas()

	// Get plugin sidebar items (includes Playground — shown under Plugins, not Platform)
	const pluginSidebarItems = usePluginSidebarItems()

	// Handle logout
	const handleLogout = useCallback(async () => {
		await logout()
		navigate('/login')
	}, [logout, navigate])

	// Build user object from auth
	const authUser = useMemo(() => {
		if (isUserLoading || !user) {
			return {
				name: 'Loading...',
				email: '',
				avatar: undefined,
			}
		}
		return {
			name: user.name || 'User',
			email: user.email || '',
			avatar: undefined,
		}
	}, [user, isUserLoading])

	// Build Content Manager sub-items from schemas
	const contentManagerItems = useMemo(() => {
		if (!schemas || schemas.length === 0) {
			return [{ title: 'No schemas yet', url: '/content-manager' }]
		}
		return schemas.map((schemaName) => {
			const n = names(schemaName)
			return {
				title: n.title,
				url: `/content-manager/${schemaName}`,
			}
		})
	}, [schemas])

	const pluginNavItems = useMemo(
		() =>
			pluginSidebarItems
				.map((item) => ({
					title: item.title,
					url: item.url,
					icon: item.icon,
					items: item.items?.map((sub) => ({
						title: sub.title,
						url: sub.url,
					})),
				}))
				.sort((a, b) => {
					const orderA =
						pluginSidebarItems.find((p) => p.title === a.title)?.order ?? 50
					const orderB =
						pluginSidebarItems.find((p) => p.title === b.title)?.order ?? 50
					return orderA - orderB
				}),
		[pluginSidebarItems],
	)

	// Default sidebar configuration for authenticated pages
	const defaultSidebarConfig: SidebarConfig = useMemo(
		() => ({
			brandName: 'magnet',
			brandUrl: '/',
			linkComponent: Link,
			navMain: [
				{
					title: 'Dashboard',
					url: '/',
					icon: LayoutDashboard,
					isActive: true,
				},
				{
					title: 'Content Manager',
					url: '/content-manager',
					icon: Layers,
					items: contentManagerItems,
				},
				{
					title: 'Media Library',
					url: '/media-library',
					icon: Image,
				},
				{
					title: 'Email',
					url: '/email-templates',
					icon: Mail,
				},
			],
			navMainLabel: 'Platform',
			navPlugins: pluginNavItems,
			navPluginsLabel: 'Plugins',
			navSecondary: [
				{
					title: 'Users',
					url: '/users',
					icon: Users,
				},
				{
					title: 'Access Control',
					url: '/access-control',
					icon: ShieldCheck,
				},
				{
					title: 'API Keys',
					url: '/api-keys',
					icon: Key,
				},
				{
					title: 'Activity',
					url: '/activity',
					icon: Activity,
				},
				{
					title: 'Vault',
					url: '/vault',
					icon: KeyRound,
				},
				{
					title: 'Settings',
					url: '/settings',
					icon: Settings,
				},
			],
			navSecondaryLabel: 'Administration',
			documents: [],
			user: authUser,
			onLogout: handleLogout,
		}),
		[contentManagerItems, pluginNavItems, authUser, handleLogout],
	)

	// User menu actions with notifications item
	const userMenuActions: UserMenuAction[] = useMemo(
		() => [
			{ label: 'Account', icon: User, href: '/settings/profile' },
			{
				label: 'Notifications',
				icon: Bell,
				badgeCount: unreadCount,
				onClick: () => setNotificationsOpen(true),
			},
		],
		[unreadCount],
	)

	// Compute active states based on current location
	const activeSidebarConfig = useMemo(() => {
		const isContentManagerPage =
			location.pathname.startsWith('/content-manager/')

		const navMain = (defaultSidebarConfig.navMain ?? []).map((item) => {
			if (item.title === 'Content Manager' && item.items) {
				const items = item.items.map((subItem) => ({
					...subItem,
					isActive: subItem.url === location.pathname,
				}))
				return {
					...item,
					isActive:
						isContentManagerPage || location.pathname === '/content-manager',
					items,
				}
			}
			return {
				...item,
				isActive: item.url === location.pathname,
			}
		})

		// Process navSecondary items for active state
		const navSecondary = (defaultSidebarConfig.navSecondary ?? []).map(
			(item) => ({
				...item,
				isActive:
					location.pathname === item.url ||
					location.pathname.startsWith(`${item.url}/`),
			}),
		)

		return {
			...defaultSidebarConfig,
			navMain,
			navSecondary,
		}
	}, [location.pathname, defaultSidebarConfig])

	// Merge sidebar config
	const mergedSidebar: SidebarConfig = {
		...activeSidebarConfig,
		...sidebar,
		navMain: sidebar?.navMain ?? activeSidebarConfig.navMain,
		userMenuActions: sidebar?.userMenuActions ?? userMenuActions,
		footerActions: sidebar?.footerActions ?? <ThemeSwitcher />,
	}

	// Default breadcrumbs from current location (used when header has no breadcrumbs)
	const locationBreadcrumbs = useMemo(() => {
		const pathnames = location.pathname.split('/').filter(Boolean)
		const crumbs: { label: string; href?: string }[] = [
			{ label: 'Home', href: '/' },
		]
		for (let i = 0; i < pathnames.length; i++) {
			const segment = pathnames[i] ?? ''
			const href = `/${pathnames.slice(0, i + 1).join('/')}`
			const cName = names(segment)
			crumbs.push({
				label: decodeURIComponent(cName.title),
				href: i < pathnames.length - 1 ? href : undefined,
			})
		}
		return crumbs
	}, [location.pathname])

	// Merge header: use provided header but ensure breadcrumbs + linkComponent
	const mergedHeader: HeaderConfig = useMemo(
		() => ({
			...header,
			breadcrumbs:
				header?.breadcrumbs && header.breadcrumbs.length > 0
					? header.breadcrumbs
					: locationBreadcrumbs,
			linkComponent: header?.linkComponent ?? Link,
		}),
		[header, locationBreadcrumbs],
	)

	return (
		<>
			<AppLayout sidebar={mergedSidebar} header={mergedHeader}>
				{children}
			</AppLayout>
			<NotificationsDrawer
				open={notificationsOpen}
				onOpenChange={setNotificationsOpen}
				showTrigger={false}
			/>
		</>
	)
}
