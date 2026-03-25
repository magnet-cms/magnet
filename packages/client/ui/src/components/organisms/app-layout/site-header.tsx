'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../atoms/breadcrumb'
import { Separator } from '../../atoms/separator'
import { SidebarTrigger } from '../../atoms/sidebar'

import type { HeaderConfig, LinkComponent } from './types'

// Portal container ID for header right-side content
export const HEADER_RIGHT_PORTAL_ID = 'header-right-portal'

export interface SiteHeaderProps {
  config?: HeaderConfig
}

/** Renders a breadcrumb link with the custom LinkComponent if provided */
function BreadcrumbNavLink({
  href,
  linkComponent: LinkComp,
  children,
}: {
  href?: string
  linkComponent?: LinkComponent
  children: React.ReactNode
}) {
  if (!href) {
    return <BreadcrumbLink>{children}</BreadcrumbLink>
  }

  if (LinkComp) {
    return (
      <BreadcrumbLink asChild>
        <LinkComp to={href}>{children}</LinkComp>
      </BreadcrumbLink>
    )
  }

  return <BreadcrumbLink href={href}>{children}</BreadcrumbLink>
}

export function SiteHeader({ config }: SiteHeaderProps) {
  const { title, content, actions, breadcrumbs, linkComponent } = config ?? {}

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1
                return (
                  <BreadcrumbItem key={crumb.label}>
                    {isLast ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <>
                        <BreadcrumbNavLink href={crumb.href} linkComponent={linkComponent}>
                          {crumb.label}
                        </BreadcrumbNavLink>
                        <BreadcrumbSeparator />
                      </>
                    )}
                  </BreadcrumbItem>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        ) : (
          title && <h1 className="text-base font-medium">{title}</h1>
        )}
        {content}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        {/* Portal target for right-side header content - pages can use createPortal to render here */}
        <div id={HEADER_RIGHT_PORTAL_ID} className="ml-auto flex items-center gap-2" />
      </div>
    </header>
  )
}
