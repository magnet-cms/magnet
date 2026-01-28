'use client'

import { MoreHorizontal, FolderOpen, Share2, Trash2 } from 'lucide-react'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../atoms/dropdown-menu'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '../../atoms/sidebar'

import type { DocumentItem, LinkComponent } from './types'

export interface NavDocumentsProps {
  items: DocumentItem[]
  label?: string
  /** Custom link component for router integration */
  linkComponent?: LinkComponent
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

export function NavDocuments({ items, label = 'Documents', linkComponent }: NavDocumentsProps) {
  const { isMobile } = useSidebar()

  if (items.length === 0) {
    return null
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <NavLink href={item.url} linkComponent={linkComponent}>
                <item.icon className="size-4" />
                <span>{item.name}</span>
              </NavLink>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover className="data-[state=open]:bg-accent rounded-sm">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-24 rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align={isMobile ? 'end' : 'start'}
              >
                <DropdownMenuItem>
                  <FolderOpen className="size-4" />
                  <span>Open</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="size-4" />
                  <span>Share</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <Trash2 className="size-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
