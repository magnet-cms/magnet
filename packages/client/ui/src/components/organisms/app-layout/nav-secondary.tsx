'use client'

import { forwardRef, type ComponentPropsWithoutRef } from 'react'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../../atoms/sidebar'

import type { LinkComponent, NavItem } from './types'

export interface NavSecondaryProps extends ComponentPropsWithoutRef<typeof SidebarGroup> {
  items: NavItem[]
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

export function NavSecondary({ items, label, linkComponent, ...props }: NavSecondaryProps) {
  return (
    <SidebarGroup {...props} className="pt-0">
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title} isActive={item.isActive}>
                <NavLink href={item.url} linkComponent={linkComponent}>
                  {item.icon && <item.icon className="size-4" />}
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
