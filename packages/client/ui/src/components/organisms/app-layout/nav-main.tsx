'use client'

import { ChevronRight } from 'lucide-react'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../atoms/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '../../atoms/sidebar'

import type { LinkComponent, NavItem } from './types'

export interface NavMainProps {
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

export function NavMain({ items, label, linkComponent }: NavMainProps) {
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const hasSubItems = item.items && item.items.length > 0

            if (hasSubItems) {
              // Check if any sub-item is active to determine if parent should be open
              const hasActiveSubItem = item.items?.some((subItem) => subItem.isActive) ?? false
              const shouldBeOpen = item.isActive || hasActiveSubItem

              return (
                <Collapsible key={item.title} asChild defaultOpen={shouldBeOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={item.isActive || hasActiveSubItem}
                      >
                        {item.icon && <item.icon className="size-4" />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={subItem.isActive}>
                              <NavLink href={subItem.url} linkComponent={linkComponent}>
                                <span>{subItem.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title} isActive={item.isActive}>
                  <NavLink href={item.url} linkComponent={linkComponent}>
                    {item.icon && <item.icon className="size-4" />}
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
