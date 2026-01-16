import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from '@magnet/ui/components'
import { names } from '@magnet/utils'
import { Database, ImageIcon, Settings2 } from 'lucide-react'
import type * as React from 'react'
import { useAdmin } from '~/contexts/useAdmin'
import { usePluginSidebarItems } from '~/core/plugins/PluginRegistry'
import { EnvSwitcher } from './EnvSwitcher'
import { NavMain } from './NavMain'
import { NavUser } from './NavUser'

export const AppSidebar = ({
	...props
}: React.ComponentProps<typeof Sidebar>) => {
	const { schemas, settings } = useAdmin()
	const pluginSidebarItems = usePluginSidebarItems()

	const contentManagerItems = schemas?.map((item: string) => {
		const name = names(item)
		return {
			title: name.title,
			url: `/content-manager/${name.key}`,
		}
	}) || [{ title: 'No Content Available', url: '/' }]

	const settingsItems =
		settings?.map((item: string) => {
			const name = names(item)
			return {
				title: name.title,
				url: `/settings/${name.key}`,
			}
		}) || []

	// Core sidebar items with order for sorting
	// Plugin items (like Playground from content-builder) are added via usePluginSidebarItems()
	const coreSidebarItems = [
		{
			title: 'Content Manager',
			url: '/',
			icon: Database,
			isActive: true,
			items: contentManagerItems,
			order: 10,
		},
		{
			title: 'Media',
			url: '/media',
			icon: ImageIcon,
			order: 30,
		},
		{
			title: 'Settings',
			url: '/',
			icon: Settings2,
			items: settingsItems,
			order: 90,
		},
	]

	// Convert plugin sidebar items to the format expected by NavMain
	const pluginItems = pluginSidebarItems.map((item) => ({
		title: item.title,
		url: item.url,
		icon: item.icon,
		order: item.order,
		items: item.items?.map((sub) => ({
			title: sub.title,
			url: sub.url,
		})),
	}))

	// Merge and sort all sidebar items by order
	const sidebarMenus = [...coreSidebarItems, ...pluginItems].sort(
		(a, b) => (a.order || 50) - (b.order || 50),
	)

	return (
		<Sidebar collapsible="icon" variant="inset" {...props}>
			<SidebarHeader>
				<EnvSwitcher />
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={sidebarMenus} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
