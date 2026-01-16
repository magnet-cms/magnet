import type { UniqueIdentifier } from '@dnd-kit/core'
import {
	Sortable,
	SortableContent,
	SortableItem,
	SortableOverlay,
} from '@magnet/ui/components'
import { AlertCircle, Plus } from 'lucide-react'
import { useSchemaBuilder } from '../hooks/useSchemaBuilder'
import type { SchemaField } from '../types/builder.types'
import { FieldCard } from './FieldCard'

interface FieldListProps {
	onAddField: () => void
}

export function FieldList({ onAddField }: FieldListProps) {
	const { state, selectField, deleteField, reorderFields } = useSchemaBuilder()

	const handleReorder = (reorderedFields: SchemaField[]) => {
		reorderFields(reorderedFields)
	}

	return (
		<div className="border rounded-xl overflow-hidden bg-background shadow-sm">
			{/* Header */}
			<div className="bg-muted/50 border-b px-4 py-2 flex items-center justify-between">
				<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
					Fields ({state.fields.length})
				</h3>
			</div>

			{/* Field List */}
			{state.fields.length === 0 ? (
				<div className="p-8 text-center text-muted-foreground">
					<AlertCircle className="mx-auto h-10 w-10 mb-3 opacity-50" />
					<p className="text-sm font-medium mb-1">No fields yet</p>
					<p className="text-xs">
						Add your first field to start building your schema
					</p>
				</div>
			) : (
				<Sortable
					value={state.fields}
					onValueChange={handleReorder}
					getItemValue={(field) => field.id}
				>
					<SortableContent className="divide-y">
						{state.fields.map((field) => (
							<SortableItem key={field.id} value={field.id}>
								<FieldCard
									field={field}
									isSelected={field.id === state.selectedFieldId}
									onClick={() => selectField(field.id)}
									onEdit={() => selectField(field.id)}
									onDelete={() => {
										if (
											window.confirm(
												`Are you sure you want to delete "${field.displayName}"?`,
											)
										) {
											deleteField(field.id)
										}
									}}
								/>
							</SortableItem>
						))}
					</SortableContent>

					<SortableOverlay>
						{({ value }: { value: UniqueIdentifier }) => {
							const field = state.fields.find((f) => f.id === value)
							return field ? (
								<div className="bg-background border rounded-lg shadow-lg">
									<FieldCard
										field={field}
										isSelected
										showActions={false}
										showDragHandle={false}
									/>
								</div>
							) : null
						}}
					</SortableOverlay>
				</Sortable>
			)}

			{/* Add Field Button */}
			<div className="p-2 bg-muted/30 border-t">
				<button
					type="button"
					onClick={onAddField}
					className="w-full py-2.5 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50 transition-all text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 group"
				>
					<div className="bg-muted rounded p-0.5 group-hover:bg-muted-foreground/20 transition-colors">
						<Plus className="h-3 w-3" />
					</div>
					Add new field
				</button>
			</div>
		</div>
	)
}
