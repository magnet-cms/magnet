import { cn } from '@magnet-cms/ui/lib/utils'

export type SettingsSectionId = 'configuration'

interface SettingsItem {
	id: SettingsSectionId
	name: string
	apiId: string
}

const settingsItems: SettingsItem[] = [
	{ id: 'configuration', name: 'Configuration', apiId: 'configuration' },
]

interface SettingsListProps {
	activeId: SettingsSectionId
	onSelect: (id: SettingsSectionId) => void
}

export function SettingsList({ activeId, onSelect }: SettingsListProps) {
	return (
		<div className="flex w-56 flex-col border-r border-border bg-background lg:flex">
			<div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4 pt-4">
				{settingsItems.map((item) => (
					<button
						key={item.id}
						type="button"
						onClick={() => onSelect(item.id)}
						className={cn(
							'group w-full rounded-md px-3 py-2 text-left transition-colors',
							activeId === item.id ? 'bg-muted' : 'hover:bg-muted/70',
						)}
					>
						<p
							className={cn(
								'text-sm font-medium',
								activeId === item.id
									? 'text-foreground'
									: 'text-muted-foreground group-hover:text-foreground',
							)}
						>
							{item.name}
						</p>
						<p className="mt-0.5 font-mono text-xs text-muted-foreground/80 group-hover:text-muted-foreground">
							{item.apiId}
						</p>
					</button>
				))}
			</div>
		</div>
	)
}
