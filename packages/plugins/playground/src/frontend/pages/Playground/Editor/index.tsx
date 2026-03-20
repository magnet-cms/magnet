import { PageContent, PageHeader, useSchema } from '@magnet-cms/admin'
import { Button, Spinner } from '@magnet-cms/ui/components'
import {
	AlertCircle,
	Boxes,
	Code2,
	FileJson,
	Info,
	Lock,
	PencilRuler,
	Rocket,
	Settings2,
} from 'lucide-react'
import { createContext, useContext, useState } from 'react'
import { useParams } from 'react-router-dom'

// Context to track if schema is read-only (existing code-defined schema)
const ReadOnlyContext = createContext(false)
import {
	SchemaBuilderContext,
	useSchemaBuilder,
	useSchemaBuilderState,
} from '../hooks/useSchemaBuilder'
import type { SchemaBuilderState, SchemaField } from '../types/builder.types'
import { DEFAULT_BUILDER_STATE } from '../types/builder.types'
import { AddFieldDialog } from './AddFieldDialog'
import { CodePreview } from './CodePreview'
import { FieldList } from './FieldList'
import { FieldSettingsPanel } from './FieldSettingsPanel'
import { SchemaList } from './SchemaList'
import { SchemaOptionsDialog } from './SchemaOptionsDialog'

/**
 * Transform SchemaMetadata from discovery API to builder state
 */
function schemaMetadataToBuilderState(
	name: string,
	metadata: any,
): SchemaBuilderState {
	return {
		schema: {
			name: name.charAt(0).toUpperCase() + name.slice(1),
			apiId: name,
			versioning: metadata.options?.versioning ?? true,
			i18n: metadata.options?.i18n ?? true,
		},
		fields:
			metadata.properties?.map((prop: any, index: number) => ({
				id: `field_${index}_${prop.name}`,
				name: prop.name,
				displayName: prop.ui?.label || prop.name,
				type: inferFieldType(prop),
				tsType: prop.type || 'string',
				prop: {
					required: prop.required || false,
					unique: prop.unique || false,
					intl: prop.intl || false,
					hidden: prop.hidden || false,
					readonly: prop.readonly || false,
				},
				ui: prop.ui || {},
				validations: (prop.validations || []).map((v: any) => ({
					type: v.name || v.type,
					constraints: v.constraints,
				})),
			})) || [],
		selectedFieldId: null,
		viewMode: 'builder',
		isDirty: false,
		lastSaved: null,
		isNew: false,
	}
}

/**
 * Infer field type from property metadata
 */
function inferFieldType(prop: any): SchemaField['type'] {
	const uiType = prop.ui?.type
	if (uiType === 'switch' || uiType === 'checkbox') return 'boolean'
	if (uiType === 'date') return 'date'
	if (uiType === 'number') return 'number'
	if (uiType === 'select' || uiType === 'radio') return 'select'
	if (uiType === 'relationship') return 'relation'

	// prop.type can be a string, object, or array - only process if string
	const tsType = typeof prop.type === 'string' ? prop.type.toLowerCase() : null
	if (tsType === 'number') return 'number'
	if (tsType === 'boolean') return 'boolean'
	if (tsType === 'date') return 'date'

	return 'text'
}

export function SchemaPlaygroundEditor() {
	const { schemaName } = useParams<{ schemaName: string }>()
	const isNewSchema = !schemaName || schemaName === 'new'

	// For existing schemas, fetch metadata
	const {
		data: schemaMetadata,
		isLoading,
		error,
	} = useSchema(schemaName && schemaName !== 'new' ? schemaName : undefined)

	if (!isNewSchema && isLoading) {
		return (
			<div className="flex justify-center items-center h-64">
				<Spinner />
			</div>
		)
	}

	if (!isNewSchema && error) {
		return (
			<div className="p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded m-8">
				<h3 className="font-medium flex items-center gap-2">
					<AlertCircle className="h-4 w-4" />
					Error loading schema
				</h3>
				<p className="text-sm mt-1">{error.message}</p>
			</div>
		)
	}

	// If editing existing schema, transform metadata to builder state
	const initialState =
		!isNewSchema && schemaMetadata && schemaName && schemaName !== 'new'
			? schemaMetadataToBuilderState(schemaName, schemaMetadata)
			: { ...DEFAULT_BUILDER_STATE, isNew: true }

	// TODO: In the future, we need to track schema source (plugin/core vs user-defined)
	// to determine if a schema should be read-only. For now, all schemas are editable.
	// Plugin and core schemas should be read-only once we have a way to identify them.
	const isReadOnly = false

	return (
		<SchemaEditorContentWithState
			key={schemaName || 'new'}
			initialState={initialState}
			isReadOnly={isReadOnly}
		/>
	)
}

function SchemaEditorContentWithState({
	initialState,
	isReadOnly,
}: {
	initialState: SchemaBuilderState
	isReadOnly: boolean
}) {
	const context = useSchemaBuilderState(initialState)

	return (
		<ReadOnlyContext.Provider value={isReadOnly}>
			<SchemaBuilderContext.Provider value={context}>
				<SchemaEditorInner />
			</SchemaBuilderContext.Provider>
		</ReadOnlyContext.Provider>
	)
}

function SchemaEditorInner() {
	const { state, setViewMode, updateSchema, generatedCode } = useSchemaBuilder()
	const isReadOnly = useContext(ReadOnlyContext)
	const [addFieldOpen, setAddFieldOpen] = useState(false)
	const [optionsOpen, setOptionsOpen] = useState(false)

	const handleDeploy = async () => {
		// TODO: Implement actual deployment
		alert(
			`Deploy functionality will be implemented in the backend phase.\n\nGenerated code:\n\n${generatedCode}`,
		)
	}

	const statusBadges: {
		type: 'warning' | 'success' | 'error' | 'info'
		label: string
		dot?: boolean
	}[] = []
	if (isReadOnly) {
		statusBadges.push({
			type: 'info',
			label: 'Read-only',
		})
	} else if (state.isDirty) {
		statusBadges.push({
			type: 'warning',
			label: 'Unsaved changes',
			dot: true,
		})
	}
	if (!isReadOnly && state.lastSaved) {
		statusBadges.push({ type: 'success', label: 'Saved', dot: true })
	}

	return (
		<div className="flex flex-col h-full">
			<PageHeader
				status={statusBadges.length > 0 ? statusBadges : undefined}
				icon={isReadOnly ? Lock : Boxes}
				title={
					isReadOnly
						? state.schema.name || 'Schema'
						: {
								value: state.schema.name,
								onChange: (name) => updateSchema({ name }),
								placeholder: 'SchemaName',
								editable: true as const,
							}
				}
				description={`api::${state.schema.name?.toLowerCase() || 'schema'}.${state.schema.name?.toLowerCase() || 'schema'}`}
				tabs={{
					items: [
						{ id: 'builder', label: 'Builder', icon: PencilRuler },
						{ id: 'json', label: 'JSON', icon: FileJson },
						{ id: 'code', label: 'Code', icon: Code2 },
					],
					value: state.viewMode,
					onChange: setViewMode,
				}}
				actions={
					isReadOnly ? undefined : (
						<>
							<Button
								variant="outline"
								size="icon"
								className="h-8 w-8"
								onClick={() => setOptionsOpen(true)}
								title="Schema Options"
							>
								<Settings2 className="h-4 w-4" />
							</Button>
							<Button variant="outline" size="sm" disabled>
								Preview API
							</Button>
							<Button
								size="sm"
								onClick={handleDeploy}
								disabled={!state.schema.name}
							>
								<Rocket className="h-4 w-4 mr-2" />
								Deploy Changes
							</Button>
						</>
					)
				}
			/>

			{/* Read-only banner for existing schemas */}
			{isReadOnly && (
				<div className="px-6 py-2 border-b border-border bg-amber-50 dark:bg-amber-950/30 flex items-center gap-2">
					<Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
					<span className="text-xs text-amber-700 dark:text-amber-400">
						This schema is defined in code and cannot be modified here. View the
						generated code in the Code tab to copy and customize.
					</span>
				</div>
			)}

			{/* Main Content - 2x7x3 grid layout */}
			<div className="flex-1 overflow-hidden grid grid-cols-12 h-full">
				{/* Schema List - 2 columns */}
				<div className="col-span-2 border-r bg-muted/30 overflow-y-auto">
					<SchemaList />
				</div>

				{/* Editor Content - 7 columns */}
				<div className="col-span-7 overflow-hidden flex flex-col">
					{state.viewMode === 'builder' ? (
						<PageContent className="p-6 overflow-y-auto flex-1">
							<div className="space-y-4">
								{/* Info Alert - only show for new schemas */}
								{!isReadOnly && (
									<div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
										<Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
										<div className="text-xs text-blue-900">
											<span className="font-medium">Schema Guidelines:</span>{' '}
											Keep field names in camelCase for better compatibility.
										</div>
									</div>
								)}

								{/* Field List */}
								<FieldList
									onAddField={
										isReadOnly ? undefined : () => setAddFieldOpen(true)
									}
									readOnly={isReadOnly}
								/>
							</div>
						</PageContent>
					) : (
						/* Code/JSON View */
						<PageContent className="p-6 overflow-y-auto flex-1">
							<CodePreview mode={state.viewMode} />
						</PageContent>
					)}
				</div>

				{/* Settings Panel - 3 columns */}
				<div className="col-span-3 border-l bg-background overflow-y-auto">
					<FieldSettingsPanel />
				</div>
			</div>

			{/* Dialogs - only for editable schemas */}
			{!isReadOnly && (
				<>
					<AddFieldDialog open={addFieldOpen} onOpenChange={setAddFieldOpen} />
					<SchemaOptionsDialog
						open={optionsOpen}
						onOpenChange={setOptionsOpen}
					/>
				</>
			)}
		</div>
	)
}

export default SchemaPlaygroundEditor
