import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from '@magnet/ui/components'
import { names } from '@magnet/utils'
import { Boxes, Database, Settings2 } from 'lucide-react'
import * as React from 'react'
import { useAdmin } from '~/contexts/useAdmin'
import { EnvSwitcher } from './EnvSwitcher'
import { NavMain } from './NavMain'
import { NavUser } from './NavUser'

export const AppSidebar = ({
	...props
}: React.ComponentProps<typeof Sidebar>) => {
	const { schemas, settings } = useAdmin()

	const contentManagerItems = schemas?.map((item: string) => {
		const name = names(item)
		return {
			title: name.title,
			url: `/content-manager/${name.key}`,
		}
	}) || [{ title: 'No Content Available', url: '/' }]

	const settingsItems = [
		{ title: 'Environments', url: '/settings/environments' },
		...(settings?.map((item: string) => {
			const name = names(item)
			return {
				title: name.title,
				url: `/settings/${name.key}`,
			}
		}) || []),
	]

	const sidebarMenus = [
		{
			title: 'Content Manager',
			url: '/',
			icon: Database,
			isActive: true,
			items: contentManagerItems,
		},
		{
			title: 'Playground',
			url: '/playground',
			icon: Boxes,
			items: [
				{ title: 'All Schemas', url: '/playground' },
				{ title: 'Create New', url: '/playground/new' },
				...contentManagerItems.map((item) => ({
					title: item.title,
					url: `/playground/${item.url.split('/').pop()}`,
				})),
			],
		},
		{
			title: 'Settings',
			url: '/',
			icon: Settings2,
			items: settingsItems,
		},
	]

	return (
		<Sidebar collapsible="icon" {...props}>
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
