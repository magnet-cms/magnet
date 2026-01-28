'use client'

import { useMemo } from 'react'

import { cn } from '../../../lib/utils'
import { SidebarInset, SidebarProvider } from '../../atoms/sidebar'

import { AppSidebar } from './app-sidebar'
import { SiteHeader } from './site-header'
import type { AppLayoutProps, HeaderConfig } from './types'

export function AppLayout({ sidebar, header, children, className }: AppLayoutProps) {
  // Merge linkComponent from sidebar to header if not already specified
  const mergedHeader: HeaderConfig | undefined = useMemo(() => {
    if (!header) return undefined
    return {
      ...header,
      linkComponent: header.linkComponent ?? sidebar.linkComponent,
    }
  }, [header, sidebar.linkComponent])

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar config={sidebar} variant="inset" />
      <SidebarInset>
        <SiteHeader config={mergedHeader} />
        <main className={cn('flex flex-1 flex-col', className)}>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
