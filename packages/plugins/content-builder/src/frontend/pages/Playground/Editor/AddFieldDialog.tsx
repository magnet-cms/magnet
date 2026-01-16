import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
} from '@magnet/ui/components'
import { cn } from '@magnet/ui/lib'
import { useState } from 'react'
import {
	FIELD_TYPES,
	FIELD_TYPE_COLORS,
	type FieldTypeDefinition,
} from '../constants/field-types'
import {
	createFieldFromType,
	useSchemaBuilder,
} from '../hooks/useSchemaBuilder'
import type { FieldType } from '../types/builder.types'

interface AddFieldDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function AddFieldDialog({ open, onOpenChange }: AddFieldDialogProps) {
	const { addField } = useSchemaBuilder()
	const [selectedType, setSelectedType] = useState<FieldType>('text')
	const [displayName, setDisplayName] = useState('')
	const [error, setError] = useState('')

	const handleAdd = () => {
		if (!displayName.trim()) {
			setError('Display name is required')
			return
		}

		const fieldData = createFieldFromType(selectedType, displayName.trim())
		addField(fieldData)
		handleClose()
	}

	const handleClose = () => {
		setSelectedType('text')
		setDisplayName('')
		setError('')
		onOpenChange(false)
	}

	const handleQuickAdd = (type: FieldTypeDefinition) => {
		const fieldData = createFieldFromType(type.id, type.label)
		addField(fieldData)
		handleClose()
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Add New Field</DialogTitle>
					<DialogDescription>
						Choose a field type and enter a display name for your new field.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Quick Add Section */}
					<div>
						<Label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">
							Quick Add
						</Label>
						<div className="grid grid-cols-3 gap-2">
							{FIELD_TYPES.map((type) => {
								const Icon = type.icon
								return (
									<button
										key={type.id}
										type="button"
										onClick={() => handleQuickAdd(type)}
										className={cn(
											'p-3 rounded-lg border text-left hover:shadow-sm transition-all',
											'hover:border-muted-foreground/50',
										)}
									>
										<div
											className={cn(
												'w-8 h-8 rounded-lg flex items-center justify-center mb-2',
												FIELD_TYPE_COLORS[type.id],
											)}
										>
											<Icon className="h-4 w-4" />
										</div>
										<div className="text-sm font-medium">{type.label}</div>
										<div className="text-[10px] text-muted-foreground line-clamp-1">
											{type.description}
										</div>
									</button>
								)
							})}
						</div>
					</div>

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-background px-2 text-muted-foreground">
								Or customize
							</span>
						</div>
					</div>

					{/* Custom Field Section */}
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="fieldType">Field Type</Label>
							<div className="grid grid-cols-3 gap-2">
								{FIELD_TYPES.map((type) => {
									const Icon = type.icon
									return (
										<button
											key={type.id}
											type="button"
											onClick={() => setSelectedType(type.id)}
											className={cn(
												'p-2 rounded-lg border flex items-center gap-2 transition-all',
												selectedType === type.id
													? 'border-foreground bg-muted'
													: 'hover:border-muted-foreground/50',
											)}
										>
											<div
												className={cn(
													'w-6 h-6 rounded flex items-center justify-center',
													FIELD_TYPE_COLORS[type.id],
												)}
											>
												<Icon className="h-3 w-3" />
											</div>
											<span className="text-sm">{type.label}</span>
										</button>
									)
								})}
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="displayName">Display Name</Label>
							<Input
								id="displayName"
								placeholder="e.g., First Name, Email Address, Birth Date..."
								value={displayName}
								onChange={(e) => {
									setDisplayName(e.target.value)
									setError('')
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && displayName.trim()) {
										handleAdd()
									}
								}}
							/>
							{error && <p className="text-xs text-destructive">{error}</p>}
							<p className="text-xs text-muted-foreground">
								The API ID will be automatically generated from the display name
							</p>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button onClick={handleAdd} disabled={!displayName.trim()}>
						Add Field
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
