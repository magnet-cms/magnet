import { SchemaMetadata } from '@magnet/common'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from '@magnet/ui/components'
import { names } from '@magnet/ui/lib'
import {
	AudioWaveform,
	BookOpen,
	Command,
	Database,
	GalleryVerticalEnd,
	Settings2,
	SquareTerminal,
} from 'lucide-react'
import * as React from 'react'
import { useAdmin } from '~/contexts/useAdmin'
import { EnvSwitcher } from './EnvSwitcher'
import { NavMain } from './NavMain'
import { NavProjects } from './NavProjects'
import { NavUser } from './NavUser'

const staticData = {
	user: {
		name: 'shadcn',
		email: 'm@example.com',
		avatar: '/avatars/shadcn.jpg',
	},
	environments: [
		{ name: 'Development', logo: GalleryVerticalEnd, plan: 'Enterprise' },
		{ name: 'Homologation', logo: AudioWaveform, plan: 'Startup' },
		{ name: 'Production', logo: Command, plan: 'Free' },
	],
	projects: [{ name: 'Documentation', url: '/', icon: BookOpen }],
}

export const AppSidebar = ({
	...props
}: React.ComponentProps<typeof Sidebar>) => {
	const { data: initialData } = useAdmin()

	const contentManagerItems = initialData?.schemas?.map(
		(item: SchemaMetadata) => {
			const name = names(item.name)
			return {
				title: name.title,
				url: `/content-manager/${name.key}`,
			}
		},
	) || [{ title: 'No Content Available', url: '/' }]

	const settingsItems = initialData?.settings?.map((item: SchemaMetadata) => {
		const name = names(item.name)
		return {
			title: name.title,
			url: `/settings/${name.key}`,
		}
	}) || [{ title: 'No Settings Available', url: '/' }]

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
			url: '/',
			icon: SquareTerminal,
			items: [{ title: 'Content', url: '/' }],
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
				<EnvSwitcher environments={staticData.environments} />
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={sidebarMenus} />
				<NavProjects projects={staticData.projects} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={staticData.user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
