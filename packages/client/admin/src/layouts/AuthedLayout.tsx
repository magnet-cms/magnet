'use client'

import type {
	HeaderConfig,
	SidebarConfig,
	UserMenuAction,
} from '@magnet-cms/ui/components/organisms/app-layout'
import { AppLayout } from '@magnet-cms/ui/components/organisms/app-layout'
import {
	Bell,
	FlaskConical,
	Image,
	Key,
	Layers,
	LayoutDashboard,
	Settings,
	ShieldCheck,
	User,
	Users,
} from 'lucide-react'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { NotificationsDrawer } from '~/features/notifications'
import { useAuth, useLogout } from '~/hooks/useAuth'
import { useSchemas } from '~/hooks/useDiscovery'

// Mock notifications for unread count calculation
// In a real app, this would come from a context or hook
const mockNotifications = [
	{
		id: '1',
		type: 'trip_invite' as const,
		title: 'Welcome to Magnet',
		message: 'Your CMS is ready to use.',
		timestamp: new Date(Date.now() - 1000 * 60 * 5),
		read: false,
		href: '/',
	},
]

const unreadCount = mockNotifications.filter((n) => !n.read).length

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

	// Get schemas for dynamic nav
	const { data: schemas } = useSchemas()

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
		return schemas.map((schemaName) => ({
			title:
				schemaName.charAt(0).toUpperCase() +
				schemaName.slice(1).replace(/([A-Z])/g, ' $1'),
			url: `/content-manager/${schemaName}`,
		}))
	}, [schemas])

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
					title: 'Playground',
					url: '/playground',
					icon: FlaskConical,
				},
				{
					title: 'Media Library',
					url: '/media-library',
					icon: Image,
				},
			],
			navMainLabel: 'Platform',
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
		[contentManagerItems, authUser, handleLogout],
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
		[],
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
	}

	return (
		<>
			<AppLayout sidebar={mergedSidebar} header={header}>
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
