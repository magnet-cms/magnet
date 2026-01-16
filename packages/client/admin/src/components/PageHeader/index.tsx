import { Input, Separator } from '@magnet-cms/ui/components'
import { cn } from '@magnet-cms/ui/lib'
import type { LucideIcon } from 'lucide-react'
import { PageHeaderStatus } from './PageHeaderStatus'
import { PageHeaderTabs } from './PageHeaderTabs'
import type { EditableTitleConfig, PageHeaderProps } from './types'

function isEditableTitle(
	title: string | EditableTitleConfig,
): title is EditableTitleConfig {
	return typeof title === 'object' && 'editable' in title && title.editable
}

/**
 * Check if icon is a component (function or forwardRef) vs a rendered element
 * ForwardRef components have $$typeof, render, displayName properties
 */
function isIconComponent(icon: unknown): icon is LucideIcon {
	if (typeof icon === 'function') return true
	if (
		typeof icon === 'object' &&
		icon !== null &&
		'$$typeof' in icon &&
		'render' in icon
	) {
		return true
	}
	return false
}

export function PageHeader<T extends string = string>({
	sticky = true,
	className,
	status,
	icon,
	title,
	description,
	tabs,
	actions,
}: PageHeaderProps<T>) {
	return (
		<>
			{/* Portal: Status Badges */}
			{status && <PageHeaderStatus badges={status} />}

			{/* Main Header */}
			<header
				className={cn(
					'border-b bg-background z-10',
					sticky && 'sticky top-0',
					className,
				)}
			>
				<div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4">
					<div className="flex items-center gap-4">
						{/* Icon */}
						{icon && (
							<div className="p-2 bg-muted rounded-md border">
								{isIconComponent(icon)
									? (() => {
											const Icon = icon
											return <Icon className="h-5 w-5 text-muted-foreground" />
										})()
									: icon}
							</div>
						)}

						{/* Title + Description */}
						<div>
							{isEditableTitle(title) ? (
								<Input
									value={title.value}
									onChange={(e) => title.onChange(e.target.value)}
									placeholder={title.placeholder}
									className="text-lg font-semibold tracking-tight border-none shadow-none p-0 h-auto focus-visible:ring-0"
								/>
							) : (
								<h1 className="text-lg font-semibold tracking-tight">
									{title}
								</h1>
							)}
							{description && (
								<p className="text-xs text-muted-foreground font-mono">
									{description}
								</p>
							)}
						</div>

						{/* Tabs */}
						{tabs && (
							<>
								<Separator orientation="vertical" className="h-8" />
								<PageHeaderTabs
									items={tabs.items}
									value={tabs.value}
									onChange={tabs.onChange}
								/>
							</>
						)}
					</div>

					{/* Actions */}
					{actions && <div className="flex items-center gap-2">{actions}</div>}
				</div>
			</header>
		</>
	)
}

// Re-export sub-components and types
export { PageContent } from './PageContent'
export { PageHeaderStatus } from './PageHeaderStatus'
export { PageHeaderTabs } from './PageHeaderTabs'
export type {
	EditableTitleConfig,
	PageContentProps,
	PageHeaderProps,
	PageHeaderStatusProps,
	PageHeaderTabsProps,
	StatusBadge,
	StatusType,
	TabItem,
	TabsConfig,
	TitleConfig,
} from './types'
