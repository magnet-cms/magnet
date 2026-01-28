import {
	Separator,
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from '@magnet-cms/ui/components'
import { Breadcrumbs } from '~/components/Breadcrumbs'
import { Outlet } from 'react-router-dom'
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
						<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
							<div className="flex items-center justify-between w-full px-4">
								<div className="flex items-center gap-2">
									<SidebarTrigger className="-ml-1" />
									<Separator orientation="vertical" className="mr-2 h-4" />
									<Breadcrumbs />
								</div>
								{/* Portal target for status badge */}
								<div
									id={HEADER_STATUS_PORTAL_ID}
									className="flex items-center gap-3"
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
