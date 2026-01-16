import type {
	SchemaBuilderState,
	SchemaField,
	ValidationRule,
} from '../types/builder.types'

/**
 * Generate TypeScript schema code from builder state
 */
export function generateSchemaCode(state: SchemaBuilderState): string {
	if (!state.schema.name) {
		return '// Enter a schema name to generate code'
	}

	const imports = generateImports(state.fields)
	const classDecorator = generateSchemaDecorator(state.schema)
	const properties = state.fields
		.map((field) => generateFieldCode(field))
		.join('\n\n')

	return `${imports}\n\n${classDecorator}\nexport class ${state.schema.name} {\n${properties}\n}\n`
}

/**
 * Generate import statements based on used features
 */
function generateImports(fields: SchemaField[]): string {
	const magnetImports = new Set(['Schema', 'Prop', 'UI'])
	const validatorImports = new Set<string>()
	let needsTypeTransformer = false

	for (const field of fields) {
		// Check if we need Validators decorator
		if (field.validations.length > 0) {
			magnetImports.add('Validators')
			for (const v of field.validations) {
				validatorImports.add(v.type)
			}
		}

		// Check if we need Type transformer (for Date fields)
		if (field.type === 'date') {
			needsTypeTransformer = true
		}
	}

	const lines: string[] = []

	// Magnet imports
	lines.push(
		`import { ${Array.from(magnetImports).sort().join(', ')} } from '@magnet/common'`,
	)

	// Class-transformer imports
	if (needsTypeTransformer) {
		lines.push(`import { Type } from 'class-transformer'`)
	}

	// Class-validator imports
	if (validatorImports.size > 0) {
		lines.push(
			`import {\n\t${Array.from(validatorImports).sort().join(',\n\t')},\n} from 'class-validator'`,
		)
	}

	return lines.join('\n')
}

/**
 * Generate @Schema() decorator
 */
function generateSchemaDecorator(schema: SchemaBuilderState['schema']): string {
	const options: string[] = []

	// Only add options if they differ from defaults or if we want to be explicit
	if (schema.versioning !== undefined) {
		options.push(`versioning: ${schema.versioning}`)
	}
	if (schema.i18n !== undefined) {
		options.push(`i18n: ${schema.i18n}`)
	}

	if (options.length === 0) {
		return '@Schema()'
	}

	return `@Schema({ ${options.join(', ')} })`
}

/**
 * Generate code for a single field
 */
function generateFieldCode(field: SchemaField): string {
	const decorators: string[] = []
	const indent = '\t'

	// @Type() decorator for Date fields (must come first)
	if (field.type === 'date') {
		decorators.push(`${indent}@Type(() => Date)`)
	}

	// @Prop() decorator
	decorators.push(`${indent}@Prop(${generatePropOptions(field)})`)

	// @Validators() decorator
	if (field.validations.length > 0) {
		const validators = field.validations
			.map((v) => formatValidator(v))
			.join(', ')
		decorators.push(`${indent}@Validators(${validators})`)
	}

	// @UI() decorator
	decorators.push(`${indent}@UI(${generateUIOptions(field)})`)

	// Property declaration
	const declaration = `${indent}${field.name}: ${field.tsType}`

	return [...decorators, declaration].join('\n')
}

/**
 * Generate @Prop() options object
 */
function generatePropOptions(field: SchemaField): string {
	const options: string[] = []

	if (field.prop.required) {
		options.push('required: true')
	}
	if (field.prop.unique) {
		options.push('unique: true')
	}
	if (field.prop.intl) {
		options.push('intl: true')
	}
	if (field.prop.hidden) {
		options.push('hidden: true')
	}
	if (field.prop.readonly) {
		options.push('readonly: true')
	}
	if (field.prop.default !== undefined) {
		options.push(`default: ${JSON.stringify(field.prop.default)}`)
	}

	if (options.length === 0) {
		return ''
	}

	return `{ ${options.join(', ')} }`
}

/**
 * Generate @UI() options object
 */
function generateUIOptions(field: SchemaField): string {
	const options: string[] = []

	if (field.ui.tab) {
		options.push(`tab: '${field.ui.tab}'`)
	}
	if (field.ui.side) {
		options.push('side: true')
	}
	if (field.ui.type) {
		options.push(`type: '${field.ui.type}'`)
	}
	if (field.ui.label && field.ui.label !== field.displayName) {
		options.push(`label: '${escapeString(field.ui.label)}'`)
	}
	if (field.ui.description) {
		options.push(`description: '${escapeString(field.ui.description)}'`)
	}
	if (field.ui.placeholder) {
		options.push(`placeholder: '${escapeString(field.ui.placeholder)}'`)
	}
	if (field.ui.row) {
		options.push('row: true')
	}
	if (field.ui.options && field.ui.options.length > 0) {
		const optionsStr = field.ui.options
			.map(
				(o) =>
					`{ key: '${escapeString(o.key)}', value: '${escapeString(o.value)}' }`,
			)
			.join(', ')
		options.push(`options: [${optionsStr}]`)
	}

	if (options.length === 0) {
		return '{}'
	}

	return `{ ${options.join(', ')} }`
}

/**
 * Format a validator call
 */
function formatValidator(rule: ValidationRule): string {
	if (!rule.constraints || rule.constraints.length === 0) {
		return `${rule.type}()`
	}

	const args = rule.constraints
		.map((c) => {
			if (typeof c === 'string') {
				// Check if it's a regex pattern
				if (rule.type === 'Matches') {
					return c.startsWith('/') ? c : `/${c}/`
				}
				return `'${escapeString(String(c))}'`
			}
			return String(c)
		})
		.join(', ')

	return `${rule.type}(${args})`
}

/**
 * Escape string for use in generated code
 */
function escapeString(str: string): string {
	return str
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r')
		.replace(/\t/g, '\\t')
}

/**
 * Generate JSON representation of the schema
 */
export function generateSchemaJSON(state: SchemaBuilderState): object {
	return {
		name: state.schema.name,
		options: {
			versioning: state.schema.versioning,
			i18n: state.schema.i18n,
		},
		properties: state.fields.map((field) => ({
			name: field.name,
			displayName: field.displayName,
			type: field.type,
			tsType: field.tsType,
			required: field.prop.required,
			unique: field.prop.unique,
			intl: field.prop.intl,
			ui: field.ui,
			validations: field.validations,
			...(field.relationConfig && { relationConfig: field.relationConfig }),
		})),
	}
}

/**
 * Parse class name to ensure it's valid
 */
export function validateSchemaName(name: string): {
	valid: boolean
	error?: string
	formatted?: string
} {
	if (!name) {
		return { valid: false, error: 'Schema name is required' }
	}

	// Must start with uppercase letter
	if (!/^[A-Z]/.test(name)) {
		return {
			valid: false,
			error: 'Schema name must start with an uppercase letter',
		}
	}

	// Only alphanumeric characters
	if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) {
		return {
			valid: false,
			error: 'Schema name can only contain letters and numbers',
		}
	}

	return { valid: true, formatted: name }
}

/**
 * Parse field name to ensure it's valid
 */
export function validateFieldName(name: string): {
	valid: boolean
	error?: string
	formatted?: string
} {
	if (!name) {
		return { valid: false, error: 'Field name is required' }
	}

	// Must start with lowercase letter
	if (!/^[a-z]/.test(name)) {
		return {
			valid: false,
			error: 'Field name must start with a lowercase letter',
		}
	}

	// Only alphanumeric characters
	if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
		return {
			valid: false,
			error: 'Field name can only contain letters and numbers (camelCase)',
		}
	}

	return { valid: true, formatted: name }
}
