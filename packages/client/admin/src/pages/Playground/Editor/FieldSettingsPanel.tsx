import {
	Button,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Separator,
	Switch,
	Textarea,
} from '@magnet/ui/components'
import { Lock, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useAdmin } from '~/contexts/useAdmin'
import {
	FIELD_TYPES,
	RELATION_TYPES,
	VALIDATION_RULES_BY_TYPE,
	getValidationRuleDefinition,
} from '../constants/field-types'
import { useSchemaBuilder } from '../hooks/useSchemaBuilder'
import type { FieldType, ValidationRule } from '../types/builder.types'

export function FieldSettingsPanel() {
	const { selectedField, updateField, selectField } = useSchemaBuilder()
	const { schemas } = useAdmin()
	const [newOptionKey, setNewOptionKey] = useState('')
	const [newOptionValue, setNewOptionValue] = useState('')

	if (!selectedField) {
		return (
			<div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center">
				<div>
					<p className="text-sm font-medium mb-1">No field selected</p>
					<p className="text-xs">Select a field to edit its settings</p>
				</div>
			</div>
		)
	}

	const fieldTypeDef = FIELD_TYPES.find((t) => t.id === selectedField.type)
	const availableValidations =
		VALIDATION_RULES_BY_TYPE[selectedField.type] || []

	const handleAddOption = () => {
		if (!newOptionKey.trim() || !newOptionValue.trim()) return
		const currentOptions = selectedField.ui.options || []
		updateField(selectedField.id, {
			ui: {
				...selectedField.ui,
				options: [
					...currentOptions,
					{ key: newOptionKey.trim(), value: newOptionValue.trim() },
				],
			},
		})
		setNewOptionKey('')
		setNewOptionValue('')
	}

	const handleRemoveOption = (index: number) => {
		const currentOptions = selectedField.ui.options || []
		updateField(selectedField.id, {
			ui: {
				...selectedField.ui,
				options: currentOptions.filter((_, i) => i !== index),
			},
		})
	}

	const handleAddValidation = (type: string) => {
		const currentValidations = selectedField.validations || []
		if (currentValidations.some((v) => v.type === type)) return

		const ruleDef = getValidationRuleDefinition(type)
		const newRule: ValidationRule = {
			type,
			constraints: ruleDef?.constraintCount ? [] : undefined,
		}
		updateField(selectedField.id, {
			validations: [...currentValidations, newRule],
		})
	}

	const handleRemoveValidation = (type: string) => {
		updateField(selectedField.id, {
			validations: selectedField.validations.filter((v) => v.type !== type),
		})
	}

	const handleUpdateValidationConstraints = (
		type: string,
		constraints: (string | number)[],
	) => {
		updateField(selectedField.id, {
			validations: selectedField.validations.map((v) =>
				v.type === type ? { ...v, constraints } : v,
			),
		})
	}

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="p-4 border-b flex items-center justify-between">
				<h2 className="text-xs font-semibold uppercase tracking-wide">
					Field Settings
				</h2>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					onClick={() => selectField(null)}
				>
					<X className="h-4 w-4" />
				</Button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-5 space-y-6">
				{/* Basic Info */}
				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label className="text-xs">Display Name</Label>
						<Input
							value={selectedField.displayName}
							onChange={(e) =>
								updateField(selectedField.id, { displayName: e.target.value })
							}
							className="font-medium"
						/>
					</div>

					<div className="space-y-1.5">
						<Label className="text-xs">API ID</Label>
						<div className="relative">
							<Input
								value={selectedField.name}
								onChange={(e) =>
									updateField(selectedField.id, { name: e.target.value })
								}
								className="font-mono text-muted-foreground pr-8"
							/>
							<Lock className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50" />
						</div>
					</div>

					<div className="space-y-1.5">
						<Label className="text-xs">Field Type</Label>
						<Select
							value={selectedField.type}
							onValueChange={(value) =>
								updateField(selectedField.id, { type: value as FieldType })
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{FIELD_TYPES.map((type) => (
									<SelectItem key={type.id} value={type.id}>
										<div className="flex items-center gap-2">
											<type.icon className="h-4 w-4" />
											{type.label}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<Separator />

				{/* UI Settings */}
				<div className="space-y-4">
					<h3 className="text-xs font-medium">UI Settings</h3>

					<div className="space-y-1.5">
						<Label className="text-xs">Tab</Label>
						<Input
							value={selectedField.ui.tab || ''}
							onChange={(e) =>
								updateField(selectedField.id, {
									ui: { ...selectedField.ui, tab: e.target.value },
								})
							}
							placeholder="General"
						/>
					</div>

					<div className="space-y-1.5">
						<Label className="text-xs">Description</Label>
						<Textarea
							value={selectedField.ui.description || ''}
							onChange={(e) =>
								updateField(selectedField.id, {
									ui: { ...selectedField.ui, description: e.target.value },
								})
							}
							placeholder="Help text for this field"
							rows={2}
						/>
					</div>

					<div className="flex items-center justify-between">
						<Label className="text-xs">Show in Side Panel</Label>
						<Switch
							checked={selectedField.ui.side || false}
							onCheckedChange={(checked) =>
								updateField(selectedField.id, {
									ui: { ...selectedField.ui, side: checked },
								})
							}
						/>
					</div>

					<div className="flex items-center justify-between">
						<Label className="text-xs">Half Width (Row)</Label>
						<Switch
							checked={selectedField.ui.row || false}
							onCheckedChange={(checked) =>
								updateField(selectedField.id, {
									ui: { ...selectedField.ui, row: checked },
								})
							}
						/>
					</div>
				</div>

				<Separator />

				{/* Constraints */}
				<div className="space-y-4">
					<h3 className="text-xs font-medium">Constraints</h3>

					<div className="flex items-center justify-between">
						<Label className="text-xs">Required</Label>
						<Switch
							checked={selectedField.prop.required || false}
							onCheckedChange={(checked) =>
								updateField(selectedField.id, {
									prop: { ...selectedField.prop, required: checked },
								})
							}
						/>
					</div>

					<div className="flex items-center justify-between">
						<Label className="text-xs">Unique</Label>
						<Switch
							checked={selectedField.prop.unique || false}
							onCheckedChange={(checked) =>
								updateField(selectedField.id, {
									prop: { ...selectedField.prop, unique: checked },
								})
							}
						/>
					</div>

					<div className="flex items-center justify-between">
						<Label className="text-xs">Hidden</Label>
						<Switch
							checked={selectedField.prop.hidden || false}
							onCheckedChange={(checked) =>
								updateField(selectedField.id, {
									prop: { ...selectedField.prop, hidden: checked },
								})
							}
						/>
					</div>

					<div className="flex items-center justify-between">
						<Label className="text-xs">Read Only</Label>
						<Switch
							checked={selectedField.prop.readonly || false}
							onCheckedChange={(checked) =>
								updateField(selectedField.id, {
									prop: { ...selectedField.prop, readonly: checked },
								})
							}
						/>
					</div>

					<div className="flex items-center justify-between">
						<Label className="text-xs">Enable i18n</Label>
						<Switch
							checked={selectedField.prop.intl || false}
							onCheckedChange={(checked) =>
								updateField(selectedField.id, {
									prop: { ...selectedField.prop, intl: checked },
								})
							}
						/>
					</div>
				</div>

				{/* Select Options */}
				{fieldTypeDef?.hasOptions && (
					<>
						<Separator />
						<div className="space-y-4">
							<h3 className="text-xs font-medium">Select Options</h3>

						{(selectedField.ui.options || []).map((option, index) => (
							<div key={option.key || `option-${index}`} className="flex items-center gap-2">
									<Input
										value={option.key}
										onChange={(e) => {
											const newOptions = [...(selectedField.ui.options || [])]
											newOptions[index] = { ...option, key: e.target.value }
											updateField(selectedField.id, {
												ui: { ...selectedField.ui, options: newOptions },
											})
										}}
										placeholder="Key"
										className="flex-1"
									/>
									<Input
										value={option.value}
										onChange={(e) => {
											const newOptions = [...(selectedField.ui.options || [])]
											newOptions[index] = { ...option, value: e.target.value }
											updateField(selectedField.id, {
												ui: { ...selectedField.ui, options: newOptions },
											})
										}}
										placeholder="Label"
										className="flex-1"
									/>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-muted-foreground hover:text-destructive"
										onClick={() => handleRemoveOption(index)}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							))}

							<div className="flex items-center gap-2">
								<Input
									value={newOptionKey}
									onChange={(e) => setNewOptionKey(e.target.value)}
									placeholder="Key"
									className="flex-1"
								/>
								<Input
									value={newOptionValue}
									onChange={(e) => setNewOptionValue(e.target.value)}
									placeholder="Label"
									className="flex-1"
								/>
								<Button
									variant="outline"
									size="icon"
									className="h-8 w-8"
									onClick={handleAddOption}
									disabled={!newOptionKey.trim() || !newOptionValue.trim()}
								>
									<Plus className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
					</>
				)}

				{/* Relation Config */}
				{fieldTypeDef?.hasRelationConfig && (
					<>
						<Separator />
						<div className="space-y-4">
							<h3 className="text-xs font-medium">Relation Configuration</h3>

							<div className="space-y-1.5">
								<Label className="text-xs">Related Schema</Label>
								<Select
									value={selectedField.relationConfig?.targetSchema || ''}
									onValueChange={(value) =>
										updateField(selectedField.id, {
											relationConfig: {
												...selectedField.relationConfig,
												targetSchema: value,
												relationType:
													selectedField.relationConfig?.relationType ||
													'manyToOne',
											},
										})
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select schema..." />
									</SelectTrigger>
									<SelectContent>
										{schemas?.map((schema) => (
											<SelectItem key={schema} value={schema}>
												{schema}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<Label className="text-xs">Relation Type</Label>
								<Select
									value={
										selectedField.relationConfig?.relationType || 'manyToOne'
									}
									onValueChange={(value) =>
										updateField(selectedField.id, {
											relationConfig: {
												...selectedField.relationConfig,
												targetSchema:
													selectedField.relationConfig?.targetSchema || '',
												relationType: value as any,
											},
										})
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{RELATION_TYPES.map((type) => (
											<SelectItem key={type.value} value={type.value}>
												{type.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</>
				)}

				{/* Validations */}
				<Separator />
				<div className="space-y-4">
					<h3 className="text-xs font-medium">Validations</h3>

					{selectedField.validations.map((validation) => {
						const ruleDef = getValidationRuleDefinition(validation.type)
						return (
							<div
								key={validation.type}
								className="p-3 bg-muted/50 rounded-lg border space-y-2"
							>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">
										{ruleDef?.label || validation.type}
									</span>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 text-muted-foreground hover:text-destructive"
										onClick={() => handleRemoveValidation(validation.type)}
									>
										<Trash2 className="h-3 w-3" />
									</Button>
								</div>
								{ruleDef?.constraintCount && ruleDef.constraintCount > 0 && (
									<div className="flex gap-2">
										{Array.from({ length: ruleDef.constraintCount }).map(
											(_, i) => (
												<Input
													key={`${validation.type}-constraint-${i}`}
													type={
														validation.type.includes('Length') ||
														validation.type.includes('Min') ||
														validation.type.includes('Max')
															? 'number'
															: 'text'
													}
													placeholder={
														ruleDef.constraintLabels?.[i] || `Arg ${i + 1}`
													}
													value={validation.constraints?.[i] ?? ''}
													onChange={(e) => {
														const newConstraints = [
															...(validation.constraints || []),
														]
														newConstraints[i] =
															validation.type.includes('Length') ||
															validation.type.includes('Min') ||
															validation.type.includes('Max')
																? Number(e.target.value)
																: e.target.value
														handleUpdateValidationConstraints(
															validation.type,
															newConstraints,
														)
													}}
													className="flex-1"
												/>
											),
										)}
									</div>
								)}
							</div>
						)
					})}

					<Select onValueChange={handleAddValidation}>
						<SelectTrigger>
							<SelectValue placeholder="Add validation..." />
						</SelectTrigger>
						<SelectContent>
							{availableValidations
								.filter(
									(v) => !selectedField.validations.some((sv) => sv.type === v),
								)
								.map((validation) => {
									const ruleDef = getValidationRuleDefinition(validation)
									return (
										<SelectItem key={validation} value={validation}>
											{ruleDef?.label || validation}
										</SelectItem>
									)
								})}
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	)
}
