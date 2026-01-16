import { Badge, Button, SortableItemHandle } from '@magnet-cms/ui/components'
import { cn } from '@magnet-cms/ui/lib'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import {
	FIELD_TYPE_COLORS,
	getFieldTypeDefinition,
} from '../constants/field-types'
import type { SchemaField } from '../types/builder.types'

interface FieldCardProps {
	field: SchemaField
	isSelected?: boolean
	isDragging?: boolean
	onClick?: () => void
	onEdit?: () => void
	onDelete?: () => void
	showActions?: boolean
	showDragHandle?: boolean
}

export function FieldCard({
	field,
	isSelected,
	isDragging,
	onClick,
	onEdit,
	onDelete,
	showActions = true,
	showDragHandle = true,
}: FieldCardProps) {
	const definition = getFieldTypeDefinition(field.type)
	const Icon = definition?.icon

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault()
			onClick?.()
		}
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: Using div for drag-and-drop compatibility
		<div
			role="button"
			tabIndex={0}
			className={cn(
				'group p-4 flex items-center justify-between transition-colors cursor-pointer border-l-2',
				isSelected
					? 'bg-muted/80 border-l-foreground'
					: 'hover:bg-muted/50 border-l-transparent hover:border-l-muted-foreground/50',
				isDragging && 'opacity-50',
			)}
			onClick={onClick}
			onKeyDown={handleKeyDown}
		>
			{/* Left side: Icon + Field Info */}
			<div className="flex items-center gap-4">
				{/* Drag Handle */}
				{showDragHandle ? (
					<SortableItemHandle className="text-muted-foreground/50 hover:text-muted-foreground touch-none">
						<GripVertical className="h-4 w-4" />
					</SortableItemHandle>
				) : (
					<div className="text-muted-foreground/50">
						<GripVertical className="h-4 w-4" />
					</div>
				)}

				{/* Field Type Icon */}
				<div
					className={cn(
						'w-8 h-8 rounded-lg flex items-center justify-center border',
						FIELD_TYPE_COLORS[field.type] ||
							'bg-muted text-muted-foreground border-muted',
					)}
				>
					{Icon && <Icon className="h-4 w-4" />}
				</div>

				{/* Field Name & Type */}
				<div className="space-y-1">
					<div className="flex items-center gap-3">
						<span className="text-sm font-semibold">{field.displayName}</span>
						<span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
							{field.name}
						</span>
					</div>
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-xs text-muted-foreground capitalize">
							{definition?.label || field.type}
						</span>
						{field.prop.required && (
							<>
								<span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
								<Badge
									variant="outline"
									className="text-[10px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200"
								>
									Required
								</Badge>
							</>
						)}
						{field.prop.unique && (
							<>
								<span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
								<Badge
									variant="outline"
									className="text-[10px] px-1.5 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200"
								>
									Unique
								</Badge>
							</>
						)}
						{field.relationConfig && (
							<>
								<span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
								<span className="text-xs text-muted-foreground">
									{field.relationConfig.relationType} (
									{field.relationConfig.targetSchema || '...'})
								</span>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Right side: Actions */}
			{showActions && (
				<div
					className={cn(
						'flex items-center gap-1 transition-opacity',
						isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
					)}
				>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={(e) => {
							e.stopPropagation()
							onEdit?.()
						}}
					>
						<Pencil className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
						onClick={(e) => {
							e.stopPropagation()
							onDelete?.()
						}}
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			)}
		</div>
	)
}
