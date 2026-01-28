'use client'

import { Box } from 'lucide-react'
import { forwardRef, type ComponentProps, type ComponentPropsWithoutRef } from 'react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../../atoms/sidebar'

import { NavDocuments } from './nav-documents'
import { NavMain } from './nav-main'
import { NavSecondary } from './nav-secondary'
import { NavUser } from './nav-user'
import type { LinkComponent, SidebarConfig } from './types'

export interface AppSidebarProps extends ComponentProps<typeof Sidebar> {
  config: SidebarConfig
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

export function AppSidebar({ config, ...props }: AppSidebarProps) {
  const {
    logo,
    brandName = 'App',
    brandUrl = '/',
    navMain = [],
    navMainLabel,
    navSecondary = [],
    navSecondaryLabel,
    documents = [],
    user,
    userMenuActions,
    onLogout,
    footerActions,
    linkComponent,
  } = config

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <NavLink href={brandUrl} linkComponent={linkComponent}>
                {logo ?? <Box className="size-5!" />}
                <span className="text-base font-semibold">{brandName}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navMain.length > 0 && (
          <>
            {/* Dashboard item without label */}
            {navMain.filter((item) => item.title === 'Dashboard').length > 0 && (
              <NavMain
                items={navMain.filter((item) => item.title === 'Dashboard')}
                linkComponent={linkComponent}
              />
            )}
            {/* Platform items with label */}
            {navMain.filter((item) => item.title !== 'Dashboard').length > 0 && (
              <NavMain
                items={navMain.filter((item) => item.title !== 'Dashboard')}
                label={navMainLabel}
                linkComponent={linkComponent}
              />
            )}
          </>
        )}
        {documents.length > 0 && <NavDocuments items={documents} linkComponent={linkComponent} />}
        {navSecondary.length > 0 && (
          <NavSecondary
            items={navSecondary}
            label={navSecondaryLabel}
            linkComponent={linkComponent}
          />
        )}
      </SidebarContent>
      {user && (
        <SidebarFooter>
          <NavUser
            user={user}
            menuActions={userMenuActions}
            onLogout={onLogout}
            rightActions={footerActions}
            linkComponent={linkComponent}
          />
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
