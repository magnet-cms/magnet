import { cn } from '@magnet-cms/ui/lib'
import type { PageHeaderTabsProps } from './types'

export function PageHeaderTabs<T extends string = string>({
	items,
	value,
	onChange,
}: PageHeaderTabsProps<T>) {
	return (
		<div className="flex bg-muted p-0.5 rounded-lg select-none">
			{items.map((item) => {
				const Icon = item.icon
				return (
					<button
						key={item.id}
						type="button"
						onClick={() => onChange(item.id)}
						className={cn(
							'px-3 py-1 text-xs font-medium rounded-[5px] transition-all flex items-center gap-2',
							value === item.id
								? 'text-foreground bg-background shadow-sm ring-1 ring-black/5'
								: 'text-muted-foreground hover:text-foreground',
						)}
					>
						{Icon && <Icon className="h-3 w-3" />}
						{item.label}
					</button>
				)
			})}
		</div>
	)
}
