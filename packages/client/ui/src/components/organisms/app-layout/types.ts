import type { Icon as TablerIcon } from '@tabler/icons-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode, ComponentType, ElementType } from 'react'

// Support both lucide and tabler icons
export type IconComponent = LucideIcon | TablerIcon | ComponentType<{ className?: string }>

/**
 * Custom link component type for router integration.
 * Defaults to 'a' for native anchor links.
 * Pass React Router's Link, Next.js Link, etc. for SPA navigation.
 *
 * The component should accept a `to` prop for navigation target.
 * Compatible with React Router's Link, TanStack Router Link, etc.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LinkComponent = ElementType<any>

export interface NavItem {
  title: string
  url: string
  icon?: IconComponent
  isActive?: boolean
  items?: {
    title: string
    url: string
    isActive?: boolean
  }[]
}

export interface NavItemWithChildren extends NavItem {
  items?: {
    title: string
    url: string
  }[]
}

export interface DocumentItem {
  name: string
  url: string
  icon: IconComponent
}

export interface UserInfo {
  name: string
  email: string
  avatar?: string
}

export interface UserMenuAction {
  label: string
  icon?: IconComponent
  onClick?: () => void
  href?: string
  variant?: 'default' | 'destructive'
  separator?: boolean
  badgeCount?: number
}

export interface SidebarConfig {
  /** Logo/brand component or icon */
  logo?: ReactNode
  /** Brand name shown in sidebar header */
  brandName?: string
  /** Brand URL for the logo link */
  brandUrl?: string
  /** Primary navigation items */
  navMain?: NavItem[]
  /** Label for primary navigation group */
  navMainLabel?: string
  /** Secondary navigation items (settings, help, etc.) */
  navSecondary?: NavItem[]
  /** Label for secondary navigation group */
  navSecondaryLabel?: string
  /** Document/resource items */
  documents?: DocumentItem[]
  /** User info for the footer */
  user?: UserInfo
  /** Custom user menu actions */
  userMenuActions?: UserMenuAction[]
  /** Callback for logout action */
  onLogout?: () => void
  /** Additional footer actions (rendered before user menu) */
  footerActions?: ReactNode
  /**
   * Custom link component for router integration.
   * Pass React Router's Link for SPA navigation with basename support.
   * Defaults to native anchor ('a') element.
   */
  linkComponent?: LinkComponent
}

export interface HeaderConfig {
  /** Page title shown in the header */
  title?: string
  /** Custom header content (left side, after breadcrumbs/title) */
  content?: ReactNode
  /** Custom header actions (right side) */
  actions?: ReactNode
  /** Breadcrumb items */
  breadcrumbs?: {
    label: string
    href?: string
  }[]
  /**
   * Custom link component for router integration (used in breadcrumbs).
   * Pass React Router's Link for SPA navigation with basename support.
   * Defaults to native anchor ('a') element.
   */
  linkComponent?: LinkComponent
}

export interface AppLayoutProps {
  /** Sidebar configuration */
  sidebar: SidebarConfig
  /** Header configuration */
  header?: HeaderConfig
  /** Main content */
  children: ReactNode
  /** Additional class names for the main content area */
  className?: string
}
