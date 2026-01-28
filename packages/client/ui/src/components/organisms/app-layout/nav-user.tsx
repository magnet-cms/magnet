'use client'

import { LogOut, MoreVertical, User, CreditCard, Bell } from 'lucide-react'
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'

import { cn } from '../../../lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '../../atoms/avatar'
import { Badge } from '../../atoms/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../atoms/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '../../atoms/sidebar'

import type { LinkComponent, UserInfo, UserMenuAction } from './types'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface NavLinkProps extends Omit<ComponentPropsWithoutRef<'a'>, 'href'> {
  href: string
  linkComponent?: LinkComponent
}

/** Wrapper component that uses custom Link or falls back to native anchor */
const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ href, linkComponent: LinkComp, children, ...props }, ref) => {
    if (LinkComp) {
      return (
        <LinkComp to={href} ref={ref} {...props}>
          {children}
        </LinkComp>
      )
    }
    return (
      <a href={href} ref={ref} {...props}>
        {children}
      </a>
    )
  }
)
NavLink.displayName = 'NavLink'

export interface NavUserProps {
  user: UserInfo
  menuActions?: UserMenuAction[]
  onLogout?: () => void
  rightActions?: ReactNode
  /** Custom link component for router integration */
  linkComponent?: LinkComponent
}

export function NavUser({ user, menuActions, onLogout, rightActions, linkComponent }: NavUserProps) {
  const { isMobile } = useSidebar()

  // Default menu actions if none provided
  const defaultActions: UserMenuAction[] = [
    { label: 'Account', icon: User },
    { label: 'Billing', icon: CreditCard },
    { label: 'Notifications', icon: Bell },
  ]

  const actions = menuActions ?? defaultActions

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
                rightActions && 'overflow-visible'
              )}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
              {rightActions && (
                <div className="flex items-center overflow-visible">{rightActions}</div>
              )}
              <MoreVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                  <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {actions.map((action, index) => {
                if (action.separator) {
                  return <DropdownMenuSeparator key={`sep-${index}`} />
                }

                const Icon = action.icon

                if (action.href) {
                  return (
                    <DropdownMenuItem key={action.label} asChild>
                      <NavLink
                        href={action.href}
                        linkComponent={linkComponent}
                        className="flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          {Icon && <Icon className="size-4" />}
                          {action.label}
                        </span>
                        {action.badgeCount !== undefined && action.badgeCount > 0 && (
                          <Badge
                            variant="default"
                            className="ml-auto size-5 items-center justify-center p-0 text-[10px]"
                          >
                            {action.badgeCount > 9 ? '9+' : action.badgeCount}
                          </Badge>
                        )}
                      </NavLink>
                    </DropdownMenuItem>
                  )
                }

                return (
                  <DropdownMenuItem
                    key={action.label}
                    onClick={action.onClick}
                    variant={action.variant}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      {Icon && <Icon className="size-4" />}
                      {action.label}
                    </span>
                    {action.badgeCount !== undefined && action.badgeCount > 0 && (
                      <Badge
                        variant="default"
                        className="ml-auto size-5 items-center justify-center p-0 text-[10px]"
                      >
                        {action.badgeCount > 9 ? '9+' : action.badgeCount}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
            {onLogout && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
