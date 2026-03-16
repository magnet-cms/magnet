import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
} from '@magnet-cms/ui/components'
import { names } from '@magnet-cms/utils'
import { Activity, Database, ImageIcon, Settings2, Webhook } from 'lucide-react'
import type * as React from 'react'
import { useAdmin } from '~/contexts/useAdmin'
import { usePluginSidebarItems } from '~/core/plugins/PluginRegistry'
import { useAppIntl } from '~/i18n'
import { EnvSwitcher } from './EnvSwitcher'
import { NavMain } from './NavMain'
import { NavUser } from './NavUser'

export const AppSidebar = ({
	...props
}: React.ComponentProps<typeof Sidebar>) => {
	const intl = useAppIntl()
	const { schemas, settings } = useAdmin()
	const pluginSidebarItems = usePluginSidebarItems()

	// Filter out internal schemas like Media (has dedicated page)
	const contentSchemas = schemas?.filter(
		(item: string) => item.toLowerCase() !== 'media',
	)

	const contentManagerItems = contentSchemas?.map((item: string) => {
		const name = names(item)
		return {
			title: name.title,
			url: `/content-manager/${name.key}`,
		}
	}) || [
		{
			title: intl.formatMessage({
				id: 'nav.noContent',
				defaultMessage: 'No Content Available',
			}),
			url: '/',
		},
	]

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
			title: intl.formatMessage({
				id: 'nav.contentManager',
				defaultMessage: 'Content Manager',
			}),
			url: '/',
			icon: Database,
			isActive: true,
			items: contentManagerItems,
			order: 10,
		},
		{
			title: intl.formatMessage({ id: 'nav.media', defaultMessage: 'Media' }),
			url: '/media',
			icon: ImageIcon,
			order: 30,
		},
		{
			title: intl.formatMessage({
				id: 'nav.activity',
				defaultMessage: 'Activity',
			}),
			url: '/activity',
			icon: Activity,
			order: 70,
		},
		{
			title: intl.formatMessage({
				id: 'nav.webhooks',
				defaultMessage: 'Webhooks',
			}),
			url: '/webhooks',
			icon: Webhook,
			order: 75,
		},
		{
			title: intl.formatMessage({
				id: 'nav.settings',
				defaultMessage: 'Settings',
			}),
			url: '/',
			icon: Settings2,
			items: settingsItems,
			order: 90,
		},
	]

	// Convert plugin sidebar items to the format expected by NavMain
	const pluginItems = pluginSidebarItems
		.map((item) => ({
			title: item.title,
			url: item.url,
			icon: item.icon,
			order: item.order,
			items: item.items?.map((sub) => ({
				title: sub.title,
				url: sub.url,
			})),
		}))
		.sort((a, b) => (a.order || 50) - (b.order || 50))

	return (
		<Sidebar collapsible="icon" variant="inset" {...props}>
			<SidebarHeader>
				<EnvSwitcher />
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={coreSidebarItems} />
				{pluginItems.length > 0 && (
					<NavMain
						label={intl.formatMessage({
							id: 'nav.plugins',
							defaultMessage: 'Plugins',
						})}
						items={pluginItems}
					/>
				)}
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
		</Sidebar>
	)
}
