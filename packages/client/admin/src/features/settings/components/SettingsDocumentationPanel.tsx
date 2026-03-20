import { ScrollArea } from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import { BookOpen, HelpCircle, Info } from 'lucide-react'

interface DocumentationItem {
	id: string
	title: string
	description: string
	icon: typeof BookOpen | typeof HelpCircle | typeof Info
}

const documentationItems: DocumentationItem[] = [
	{
		id: 'configuration',
		title: 'Configuration',
		description:
			'Configure your project settings including display name, environment, and public URL. These settings affect how your project appears and functions.',
		icon: Info,
	},
	{
		id: 'preferences',
		title: 'Preferences',
		description:
			'Manage system preferences like maintenance mode, public logs visibility, and automatic updates. These settings control system behavior and security.',
		icon: HelpCircle,
	},
	{
		id: 'project-identity',
		title: 'Project Identity',
		description:
			'Set your project display name, icon, and environment. The display name appears in dashboards and notifications.',
		icon: BookOpen,
	},
]

interface SettingsDocumentationPanelProps {
	activeSection?: string
}

export function SettingsDocumentationPanel({
	activeSection = 'configuration',
}: SettingsDocumentationPanelProps) {
	const activeItem =
		documentationItems.find((item) => item.id === activeSection) ??
		documentationItems[0]

	if (!activeItem) return null

	return (
		<aside className="w-80 bg-card border-l border-border hidden md:flex flex-col">
			<div className="flex items-center justify-between p-4 border-b border-border shrink-0">
				<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
					Documentation
				</h3>
			</div>
			<ScrollArea className="flex-1">
				<div className="p-4 space-y-6">
					<div className="space-y-4">
						<div className="flex items-start gap-3">
							<div className="shrink-0 mt-0.5">
								<div className="rounded-full bg-muted flex items-center justify-center w-8 h-8">
									{(() => {
										const IconComponent = activeItem.icon
										return (
											<IconComponent className="w-4 h-4 text-muted-foreground" />
										)
									})()}
								</div>
							</div>
							<div className="flex-1 min-w-0">
								<h4 className="text-sm font-semibold text-foreground mb-1">
									{activeItem.title}
								</h4>
								<p className="text-xs text-muted-foreground leading-relaxed">
									{activeItem.description}
								</p>
							</div>
						</div>
					</div>

					<div className="border-t border-border pt-4">
						<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
							Help & Resources
						</h4>
						<div className="space-y-3">
							{documentationItems.map((item) => {
								const IconComponent = item.icon
								return (
									<div
										key={item.id}
										className={cn(
											'flex gap-3 rounded-lg border transition-colors',
											activeSection === item.id
												? 'border-border bg-muted/50'
												: 'border-border/60 hover:border-border hover:bg-muted/50',
										)}
									>
										<div className="shrink-0 mt-0.5 p-2">
											<div className="rounded-full bg-muted flex items-center justify-center w-6 h-6">
												<IconComponent className="w-3 h-3 text-muted-foreground" />
											</div>
										</div>
										<div className="flex-1 min-w-0 py-2 pr-2">
											<p className="text-xs font-medium text-foreground">
												{item.title}
											</p>
											<p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
												{item.description}
											</p>
										</div>
									</div>
								)
							})}
						</div>
					</div>

					<div className="border-t border-border pt-4">
						<div className="rounded-lg bg-muted/50 border border-border p-3">
							<div className="flex items-start gap-2">
								<HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
								<div>
									<p className="text-xs font-medium text-foreground mb-1">
										Need Help?
									</p>
									<p className="text-[11px] text-muted-foreground leading-relaxed">
										Check our documentation or contact support for assistance
										with settings configuration.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</ScrollArea>
		</aside>
	)
}
