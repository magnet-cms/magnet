import {
	Separator,
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from '@magnet-cms/ui/components'
import { Outlet } from 'react-router-dom'
import { Breadcrumbs } from '~/components/Breadcrumbs'
import { NotificationsDrawer } from '~/components/Notifications'
import { EnvironmentProvider } from '~/contexts/EnvironmentContext'
import { NotificationsProvider } from '~/contexts/NotificationsContext'
import { AppSidebar } from './AppSidebar'

// Portal ID for status badge in header
export const HEADER_STATUS_PORTAL_ID = 'header-status-portal'

export const DashboardLayout = () => {
	return (
		<EnvironmentProvider>
			<NotificationsProvider>
				<SidebarProvider defaultOpen={true}>
					<AppSidebar />
					<SidebarInset>
						<header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
							<div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
								<SidebarTrigger className="-ml-1" />
								<Separator
									orientation="vertical"
									className="mx-2 hidden h-4 md:block"
								/>
								<Breadcrumbs />
								{/* Portal target for status badge */}
								<div
									id={HEADER_STATUS_PORTAL_ID}
									className="ml-auto flex items-center gap-3"
								/>
							</div>
						</header>
						<div className="flex flex-1 flex-col">
							<Outlet />
						</div>
					</SidebarInset>
					<NotificationsDrawer />
				</SidebarProvider>
			</NotificationsProvider>
		</EnvironmentProvider>
	)
}
