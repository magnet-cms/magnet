import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	Skeleton,
	useSidebar,
} from '@magnet-cms/ui/components'
import { Check, ChevronsUpDown, Database, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEnvironmentContext } from '~/contexts/EnvironmentContext'

export const EnvSwitcher = () => {
	const { isMobile } = useSidebar()
	const navigate = useNavigate()
	const { environments, activeEnvironment, isLoading, setActiveEnvironment } =
		useEnvironmentContext()

	if (isLoading) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton size="lg">
						<Skeleton className="h-8 w-8 rounded-lg" />
						<div className="grid flex-1 gap-1">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-16" />
						</div>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		)
	}

	if (environments.length === 0) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton
						size="lg"
						onClick={() => navigate('/settings/environments')}
					>
						<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
							<Database className="size-4" />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">No Environment</span>
							<span className="truncate text-xs text-muted-foreground">
								Click to configure
							</span>
						</div>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		)
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
								<Database className="size-4" />
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">
									{activeEnvironment?.name || 'Select Environment'}
								</span>
								<span className="truncate text-xs text-muted-foreground">
									{activeEnvironment?.isDefault ? 'Default' : 'Environment'}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						align="start"
						side={isMobile ? 'bottom' : 'right'}
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-xs text-muted-foreground">
							Environments
						</DropdownMenuLabel>
						{environments.map((env) => (
							<DropdownMenuItem
								key={env.id}
								onClick={() => setActiveEnvironment(env)}
								className="gap-2 p-2"
							>
								<div className="flex size-6 items-center justify-center rounded-sm border">
									<Database className="size-4 shrink-0" />
								</div>
								<span className="flex-1">{env.name}</span>
								{activeEnvironment?.id === env.id && (
									<Check className="size-4" />
								)}
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="gap-2 p-2"
							onClick={() => navigate('/settings/environments')}
						>
							<div className="flex size-6 items-center justify-center rounded-md border bg-background">
								<Settings className="size-4" />
							</div>
							<div className="font-medium text-muted-foreground">
								Manage Environments
							</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
