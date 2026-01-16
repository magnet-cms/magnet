import { useAdmin } from '@magnet-cms/admin'
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@magnet-cms/ui/components'
import { cn } from '@magnet-cms/ui/lib'
import { useState } from 'react'
import type { RelationConfig } from '../types/builder.types'

interface RelationConfigModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	currentSchema: string
	relationConfig: RelationConfig | undefined
	onSave: (config: RelationConfig) => void
}

type RelationType = 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany'

interface RelationTypeOption {
	value: RelationType
	label: string
	description: string
	diagram: {
		leftMultiple: boolean
		rightMultiple: boolean
	}
}

const RELATION_TYPE_OPTIONS: RelationTypeOption[] = [
	{
		value: 'oneToOne',
		label: 'One to One',
		description: 'Each record relates to exactly one other record',
		diagram: { leftMultiple: false, rightMultiple: false },
	},
	{
		value: 'oneToMany',
		label: 'One to Many',
		description: 'One record can relate to many other records',
		diagram: { leftMultiple: false, rightMultiple: true },
	},
	{
		value: 'manyToOne',
		label: 'Many to One',
		description: 'Many records can relate to one other record',
		diagram: { leftMultiple: true, rightMultiple: false },
	},
	{
		value: 'manyToMany',
		label: 'Many to Many',
		description: 'Many records can relate to many other records',
		diagram: { leftMultiple: true, rightMultiple: true },
	},
]

function RelationDiagram({
	leftLabel,
	rightLabel,
	leftMultiple,
	rightMultiple,
	small = false,
}: {
	leftLabel: string
	rightLabel: string
	leftMultiple: boolean
	rightMultiple: boolean
	small?: boolean
}) {
	return (
		<div className="flex items-center justify-center gap-2">
			{/* Left side */}
			<div className="flex items-center gap-1">
				{leftMultiple && (
					<div
						className={cn(
							'bg-background border rounded font-medium shadow-sm opacity-50 -mr-1',
							small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
						)}
					>
						{leftLabel}
					</div>
				)}
				<div
					className={cn(
						'bg-background border rounded font-medium shadow-sm relative z-10',
						small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
					)}
				>
					{leftLabel}
				</div>
			</div>

			{/* Connection line */}
			<div className="flex items-center">
				<div
					className={cn(
						'bg-muted-foreground/60 rounded-full',
						small ? 'w-1.5 h-1.5' : 'w-2 h-2',
					)}
				/>
				<div
					className={cn('h-px bg-muted-foreground/60', small ? 'w-6' : 'w-10')}
				/>
				<div
					className={cn(
						'border-r-2 border-t-2 border-b-2 border-muted-foreground/60 rotate-45',
						small ? 'w-1.5 h-1.5 -ml-1' : 'w-2 h-2 -ml-1.5',
					)}
				/>
			</div>

			{/* Right side */}
			<div className="flex items-center gap-1">
				<div
					className={cn(
						'bg-background border rounded font-medium shadow-sm relative z-10',
						small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
					)}
				>
					{rightLabel}
				</div>
				{rightMultiple && (
					<div
						className={cn(
							'bg-background border rounded font-medium shadow-sm opacity-50 -ml-1',
							small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
						)}
					>
						{rightLabel}
					</div>
				)}
			</div>
		</div>
	)
}

export function RelationConfigModal({
	open,
	onOpenChange,
	currentSchema,
	relationConfig,
	onSave,
}: RelationConfigModalProps) {
	const { schemas } = useAdmin()
	const [config, setConfig] = useState<RelationConfig>({
		targetSchema: relationConfig?.targetSchema || '',
		relationType: relationConfig?.relationType || 'manyToOne',
		inverseSide: relationConfig?.inverseSide,
	})

	const handleSave = () => {
		onSave(config)
		onOpenChange(false)
	}

	const selectedTypeOption = RELATION_TYPE_OPTIONS.find(
		(t) => t.value === config.relationType,
	)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Configure Relation</DialogTitle>
					<DialogDescription>
						Define how this field relates to another schema
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Relation Type Picker */}
					<div className="space-y-3">
						<Label className="text-sm font-medium">Relation Type</Label>
						<div className="grid grid-cols-2 gap-3">
							{RELATION_TYPE_OPTIONS.map((option) => (
								<button
									key={option.value}
									type="button"
									onClick={() =>
										setConfig((c) => ({ ...c, relationType: option.value }))
									}
									className={cn(
										'p-3 rounded-lg border text-left transition-all',
										config.relationType === option.value
											? 'border-primary bg-primary/5 ring-1 ring-primary'
											: 'border-border hover:border-muted-foreground/50 hover:bg-muted/50',
									)}
								>
									<div className="mb-2">
										<RelationDiagram
											leftLabel={currentSchema || 'A'}
											rightLabel={config.targetSchema || 'B'}
											leftMultiple={option.diagram.leftMultiple}
											rightMultiple={option.diagram.rightMultiple}
											small
										/>
									</div>
									<p className="text-sm font-medium">{option.label}</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										{option.description}
									</p>
								</button>
							))}
						</div>
					</div>

					{/* Preview */}
					{selectedTypeOption && (
						<div className="p-4 bg-muted/30 rounded-lg border">
							<p className="text-xs text-muted-foreground mb-3 text-center">
								Preview
							</p>
							<RelationDiagram
								leftLabel={currentSchema || 'Current'}
								rightLabel={config.targetSchema || 'Target'}
								leftMultiple={selectedTypeOption.diagram.leftMultiple}
								rightMultiple={selectedTypeOption.diagram.rightMultiple}
							/>
						</div>
					)}

					{/* Target Schema */}
					<div className="space-y-2">
						<Label className="text-sm font-medium">Related Collection</Label>
						<Select
							value={config.targetSchema}
							onValueChange={(value) =>
								setConfig((c) => ({ ...c, targetSchema: value }))
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select a schema..." />
							</SelectTrigger>
							<SelectContent>
								{schemas?.map((schema) => (
									<SelectItem key={schema} value={schema}>
										{schema}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							The schema this field will reference
						</p>
					</div>

					{/* Inverse Field Name */}
					<div className="space-y-2">
						<Label className="text-sm font-medium">
							Inverse Field Name{' '}
							<span className="text-muted-foreground font-normal">
								(optional)
							</span>
						</Label>
						<Input
							value={config.inverseSide || ''}
							onChange={(e) =>
								setConfig((c) => ({ ...c, inverseSide: e.target.value }))
							}
							placeholder={`e.g., ${currentSchema?.toLowerCase() || 'items'}`}
						/>
						<p className="text-xs text-muted-foreground">
							Field name on the related schema for bidirectional access
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={!config.targetSchema}>
						Save Configuration
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
