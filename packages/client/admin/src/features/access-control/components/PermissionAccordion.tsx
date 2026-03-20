import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import { Check } from 'lucide-react'

import { PermissionItem } from './PermissionItem'

interface Permission {
	id: string
	name: string
	description: string
	checked?: boolean
}

interface PermissionGroup {
	id: string
	name: string
	apiId?: string
	permissions: Permission[]
	isOpen?: boolean
}

interface PermissionAccordionProps {
	group: PermissionGroup
	onTogglePermission: (groupId: string, permissionId: string) => void
	onToggleSelectAll: (groupId: string) => void
}

export function PermissionAccordion({
	group,
	onTogglePermission,
	onToggleSelectAll,
}: PermissionAccordionProps) {
	const allChecked = group.permissions.every((p) => p.checked)

	return (
		<div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
			<Accordion
				type="single"
				collapsible
				defaultValue={group.isOpen ? group.id : undefined}
			>
				<AccordionItem value={group.id} className="border-0">
					<AccordionTrigger className="border-b border-border bg-muted/50 px-4 py-3 hover:bg-muted hover:no-underline">
						<div className="flex w-full items-center justify-between pr-4">
							<div className="flex items-center gap-3">
								<span className="text-sm font-medium text-foreground">
									{group.name}
								</span>
								{group.apiId && (
									<span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
										{group.apiId}
									</span>
								)}
							</div>
							<div className="flex items-center gap-4">
								<label
									className="group flex cursor-pointer items-center gap-2"
									onClick={(e) => e.stopPropagation()}
									onKeyDown={(e) => e.stopPropagation()}
								>
									<div className="relative flex items-center justify-center">
										<input
											type="checkbox"
											checked={allChecked}
											onChange={() => onToggleSelectAll(group.id)}
											className="peer h-4 w-4 appearance-none rounded border border-input bg-background transition-all checked:border-primary checked:bg-primary focus-visible:outline-none"
										/>
										<div className="pointer-events-none absolute flex size-4 items-center justify-center rounded transition-all peer-checked:bg-primary peer-checked:border-primary">
											<Check
												className={cn(
													'size-3 text-primary-foreground transition-opacity',
													allChecked ? 'opacity-100' : 'opacity-0',
												)}
												strokeWidth={3}
											/>
										</div>
									</div>
									<span className="select-none text-xs text-muted-foreground group-hover:text-foreground">
										Select All
									</span>
								</label>
							</div>
						</div>
					</AccordionTrigger>
					<AccordionContent>
						<div className="grid grid-cols-1 gap-4 bg-background p-4 sm:grid-cols-2 lg:grid-cols-3">
							{group.permissions.map((permission) => (
								<PermissionItem
									key={permission.id}
									permission={permission}
									onToggle={(permissionId) =>
										onTogglePermission(group.id, permissionId)
									}
								/>
							))}
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	)
}
