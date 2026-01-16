import { cn } from '@magnet-cms/ui/lib'
import type { PageContentProps } from './types'

export function PageContent({ children, className }: PageContentProps) {
	return (
		<div className={cn('flex-1 overflow-y-auto bg-muted/30', className)}>
			{children}
		</div>
	)
}
