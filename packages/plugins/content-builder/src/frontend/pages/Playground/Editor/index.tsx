import { PageContent, PageHeader, useSchema } from '@magnet/admin'
import { Button, Spinner } from '@magnet/ui/components'
import {
	AlertCircle,
	Boxes,
	Code2,
	FileJson,
	Info,
	PencilRuler,
	Rocket,
	Settings2,
} from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
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

	const tsType = prop.type?.toLowerCase()
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

	return (
		<SchemaEditorContentWithState
			key={schemaName || 'new'}
			initialState={initialState}
		/>
	)
}

function SchemaEditorContentWithState({
	initialState,
}: {
	initialState: SchemaBuilderState
}) {
	const context = useSchemaBuilderState(initialState)

	return (
		<SchemaBuilderContext.Provider value={context}>
			<SchemaEditorInner />
		</SchemaBuilderContext.Provider>
	)
}

function SchemaEditorInner() {
	const { state, setViewMode, updateSchema, generatedCode } = useSchemaBuilder()
	const [addFieldOpen, setAddFieldOpen] = useState(false)
	const [optionsOpen, setOptionsOpen] = useState(false)

	const handleDeploy = async () => {
		// TODO: Implement actual deployment
		alert(
			`Deploy functionality will be implemented in the backend phase.\n\nGenerated code:\n\n${generatedCode}`,
		)
	}

	const statusBadges = []
	if (state.isDirty) {
		statusBadges.push({
			type: 'warning' as const,
			label: 'Unsaved changes',
			dot: true,
		})
	}
	if (state.lastSaved) {
		statusBadges.push({ type: 'success' as const, label: 'Saved', dot: true })
	}

	return (
		<div className="flex flex-col h-full">
			<PageHeader
				status={statusBadges.length > 0 ? statusBadges : undefined}
				icon={Boxes}
				title={{
					value: state.schema.name,
					onChange: (name) => updateSchema({ name }),
					placeholder: 'SchemaName',
					editable: true,
				}}
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
				}
			/>

			{/* Main Content */}
			<div className="flex-1 flex overflow-hidden">
				{state.viewMode === 'builder' ? (
					<>
						{/* Builder View */}
						<PageContent className="p-8">
							<div className="max-w-3xl mx-auto space-y-6">
								{/* Info Alert */}
								<div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
									<Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
									<div className="text-xs text-blue-900">
										<span className="font-medium">Schema Guidelines:</span> Keep
										field names in camelCase for better compatibility. Changes
										here will generate TypeScript code with decorators.
									</div>
								</div>

								{/* Field List */}
								<FieldList onAddField={() => setAddFieldOpen(true)} />
							</div>
						</PageContent>

						{/* Settings Panel */}
						<div className="w-80 border-l bg-background shrink-0">
							<FieldSettingsPanel />
						</div>
					</>
				) : (
					/* Code/JSON View */
					<PageContent className="p-8">
						<div className="max-w-4xl mx-auto h-full">
							<CodePreview mode={state.viewMode} />
						</div>
					</PageContent>
				)}
			</div>

			{/* Dialogs */}
			<AddFieldDialog open={addFieldOpen} onOpenChange={setAddFieldOpen} />
			<SchemaOptionsDialog open={optionsOpen} onOpenChange={setOptionsOpen} />
		</div>
	)
}

export default SchemaPlaygroundEditor
