import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useReducer,
} from 'react'
import { getFieldTypeDefinition } from '../constants/field-types'
import {
	DEFAULT_BUILDER_STATE,
	FIELD_TYPE_TO_TS_TYPE,
	type SchemaBuilderAction,
	type SchemaBuilderContextType,
	type SchemaBuilderState,
	type SchemaConfig,
	type SchemaField,
	type ViewMode,
} from '../types/builder.types'
import { generateSchemaCode, generateSchemaJSON } from '../utils/code-generator'

/**
 * Generate a unique ID for fields
 */
function generateId(): string {
	return `field_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Convert display name to API ID (camelCase)
 */
function toApiId(displayName: string): string {
	return displayName
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, '')
		.split(/\s+/)
		.filter(Boolean)
		.map((word, index) =>
			index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
		)
		.join('')
}

/**
 * Schema builder reducer
 */
function schemaBuilderReducer(
	state: SchemaBuilderState,
	action: SchemaBuilderAction,
): SchemaBuilderState {
	switch (action.type) {
		case 'SET_SCHEMA':
			return {
				...state,
				schema: { ...state.schema, ...action.payload },
				isDirty: true,
			}

		case 'ADD_FIELD':
			return {
				...state,
				fields: [...state.fields, action.payload],
				selectedFieldId: action.payload.id,
				isDirty: true,
			}

		case 'UPDATE_FIELD':
			return {
				...state,
				fields: state.fields.map((field) =>
					field.id === action.payload.id
						? { ...field, ...action.payload.changes }
						: field,
				),
				isDirty: true,
			}

		case 'DELETE_FIELD':
			return {
				...state,
				fields: state.fields.filter((field) => field.id !== action.payload),
				selectedFieldId:
					state.selectedFieldId === action.payload
						? null
						: state.selectedFieldId,
				isDirty: true,
			}

		case 'REORDER_FIELDS':
			return {
				...state,
				fields: action.payload,
				isDirty: true,
			}

		case 'SELECT_FIELD':
			return {
				...state,
				selectedFieldId: action.payload,
			}

		case 'SET_VIEW_MODE':
			return {
				...state,
				viewMode: action.payload,
			}

		case 'MARK_DIRTY':
			return {
				...state,
				isDirty: true,
			}

		case 'MARK_SAVED':
			return {
				...state,
				isDirty: false,
				lastSaved: new Date(),
			}

		case 'RESET':
			return action.payload

		case 'LOAD_SCHEMA':
			return {
				...state,
				schema: action.payload.schema,
				fields: action.payload.fields,
				isDirty: false,
				isNew: false,
			}

		default:
			return state
	}
}

/**
 * Schema builder context
 */
export const SchemaBuilderContext =
	createContext<SchemaBuilderContextType | null>(null)

/**
 * Hook to access the schema builder context
 */
export function useSchemaBuilder(): SchemaBuilderContextType {
	const context = useContext(SchemaBuilderContext)
	if (!context) {
		throw new Error(
			'useSchemaBuilder must be used within a SchemaBuilderProvider',
		)
	}
	return context
}

/**
 * Hook to create the schema builder state and actions
 */
export function useSchemaBuilderState(
	initialState: SchemaBuilderState = DEFAULT_BUILDER_STATE,
): SchemaBuilderContextType {
	const [state, dispatch] = useReducer(schemaBuilderReducer, initialState)

	// Convenience actions
	const addField = useCallback((partial: Partial<SchemaField>) => {
		const fieldType = partial.type || 'text'
		const definition = getFieldTypeDefinition(fieldType)
		const displayName = partial.displayName || 'New Field'
		const name = partial.name || toApiId(displayName)

		const field: SchemaField = {
			id: generateId(),
			name,
			displayName,
			type: fieldType,
			tsType:
				definition?.tsType || FIELD_TYPE_TO_TS_TYPE[fieldType] || 'string',
			prop: {
				required: false,
				unique: false,
				...partial.prop,
			},
			ui: {
				tab: 'General',
				...definition?.defaultUI,
				...partial.ui,
			},
			validations: partial.validations || definition?.defaultValidations || [],
			relationConfig: partial.relationConfig,
		}

		dispatch({ type: 'ADD_FIELD', payload: field })
	}, [])

	const updateField = useCallback(
		(id: string, changes: Partial<SchemaField>) => {
			dispatch({ type: 'UPDATE_FIELD', payload: { id, changes } })
		},
		[],
	)

	const deleteField = useCallback((id: string) => {
		dispatch({ type: 'DELETE_FIELD', payload: id })
	}, [])

	const selectField = useCallback((id: string | null) => {
		dispatch({ type: 'SELECT_FIELD', payload: id })
	}, [])

	const reorderFields = useCallback((fields: SchemaField[]) => {
		dispatch({ type: 'REORDER_FIELDS', payload: fields })
	}, [])

	const setViewMode = useCallback((mode: ViewMode) => {
		dispatch({ type: 'SET_VIEW_MODE', payload: mode })
	}, [])

	const updateSchema = useCallback((changes: Partial<SchemaConfig>) => {
		dispatch({ type: 'SET_SCHEMA', payload: changes })
	}, [])

	const resetState = useCallback((newState?: SchemaBuilderState) => {
		dispatch({ type: 'RESET', payload: newState || DEFAULT_BUILDER_STATE })
	}, [])

	// Computed values
	const selectedField = useMemo(
		() => state.fields.find((f) => f.id === state.selectedFieldId) ?? null,
		[state.fields, state.selectedFieldId],
	)

	const generatedCode = useMemo(() => generateSchemaCode(state), [state])

	const generatedJSON = useMemo(() => generateSchemaJSON(state), [state])

	return {
		state,
		dispatch,
		addField,
		updateField,
		deleteField,
		selectField,
		reorderFields,
		setViewMode,
		updateSchema,
		resetState,
		selectedField,
		generatedCode,
		generatedJSON,
	}
}

/**
 * Create a field from a field type definition
 */
export function createFieldFromType(
	type: SchemaField['type'],
	displayName: string,
): Partial<SchemaField> {
	const definition = getFieldTypeDefinition(type)
	if (!definition) {
		return { type, displayName }
	}

	return {
		type,
		displayName,
		name: toApiId(displayName),
		tsType: definition.tsType,
		validations: [...definition.defaultValidations],
		ui: { ...definition.defaultUI },
		prop: { required: false, unique: false },
		...(definition.hasRelationConfig && {
			relationConfig: {
				targetSchema: '',
				relationType: 'manyToOne',
			},
		}),
	}
}
