import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Status badge types for the portal status indicator
 */
export type StatusType = 'warning' | 'success' | 'error' | 'info'

/**
 * Status badge configuration
 */
export interface StatusBadge {
  type: StatusType
  label: string
  dot?: boolean
}

/**
 * Tab item for ViewToggle-style tabs
 */
export interface TabItem<T extends string = string> {
  id: T
  label: string
  icon?: LucideIcon
}

/**
 * Editable title configuration
 */
export interface EditableTitleConfig {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  editable: true
}

/**
 * Title can be a static string or an editable configuration
 */
export type TitleConfig = string | EditableTitleConfig

/**
 * Tabs configuration for PageHeader
 */
export interface TabsConfig<T extends string = string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
}

/**
 * Main PageHeader component props
 */
export interface PageHeaderProps<T extends string = string> {
  /** Sticky behavior (default: true) */
  sticky?: boolean
  /** Additional className for the header */
  className?: string

  /** Status badges - portaled to DashboardLayout header (right side) */
  status?: StatusBadge | StatusBadge[]

  /** Icon to display (LucideIcon or custom ReactNode) */
  icon?: LucideIcon | ReactNode

  /** Title - static string or editable input config */
  title: TitleConfig

  /** Description text below the title (e.g., "api::user.user") */
  description?: string

  /** ViewToggle-style tabs */
  tabs?: TabsConfig<T>

  /** Right-side action buttons */
  actions?: ReactNode
}

/**
 * PageHeaderStatus component props
 */
export interface PageHeaderStatusProps {
  badges: StatusBadge | StatusBadge[]
}

/**
 * PageHeaderTabs component props
 */
export interface PageHeaderTabsProps<T extends string = string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
}

/**
 * PageContent component props
 */
export interface PageContentProps {
  children: ReactNode
  className?: string
}
