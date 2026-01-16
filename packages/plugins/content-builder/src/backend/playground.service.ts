import * as fs from 'node:fs'
import * as path from 'node:path'
import { MagnetModuleOptions } from '@magnet-cms/common'
import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import type {
	CodePreviewDto,
	ConflictInfo,
	CreateModuleResponseDto,
	CreateSchemaDto,
	SchemaDetailDto,
	SchemaFieldDto,
	SchemaListItemDto,
	ValidationRuleDto,
} from './dto/schema.dto'

/**
 * Plugin-specific options for the content builder
 */
export interface ContentBuilderOptions {
	/**
	 * Path to the directory where module folders will be created
	 * @example './src/modules'
	 */
	modulesPath?: string
}

@Injectable()
export class PlaygroundService {
	private readonly logger = new Logger(PlaygroundService.name)

	constructor(
		@Optional()
		@Inject(MagnetModuleOptions)
		private readonly magnetOptions?: MagnetModuleOptions,
		@Optional()
		@Inject('CONTENT_BUILDER_OPTIONS')
		private readonly pluginOptions?: ContentBuilderOptions,
	) {}

	/**
	 * Get the modules directory path from options or use default
	 */
	private getModulesDir(): string {
		// Check plugin-specific options first
		if (this.pluginOptions?.modulesPath) {
			return this.pluginOptions.modulesPath
		}

		// Fall back to magnet module options
		const opts = this.magnetOptions as {
			playground?: { modulesPath?: string; schemasPath?: string }
		}
		return (
			opts?.playground?.modulesPath ||
			opts?.playground?.schemasPath ||
			path.join(process.cwd(), 'src', 'modules')
		)
	}

	/**
	 * List all schemas by scanning module directories
	 */
	async listSchemas(): Promise<SchemaListItemDto[]> {
		const modulesDir = this.getModulesDir()

		if (!fs.existsSync(modulesDir)) {
			return []
		}

		const schemas: SchemaListItemDto[] = []
		const entries = fs.readdirSync(modulesDir, { withFileTypes: true })

		for (const entry of entries) {
			if (!entry.isDirectory()) continue

			// Look for schema file in module directory
			const schemaFile = path.join(
				modulesDir,
				entry.name,
				`${entry.name}.schema.ts`,
			)
			// Also check schemas subfolder (legacy pattern)
			const schemaFileAlt = path.join(
				modulesDir,
				entry.name,
				'schemas',
				`${entry.name}.schema.ts`,
			)

			const filePath = fs.existsSync(schemaFile)
				? schemaFile
				: fs.existsSync(schemaFileAlt)
					? schemaFileAlt
					: null

			if (!filePath) continue

			const content = fs.readFileSync(filePath, 'utf-8')
			const parsed = this.parseSchemaFile(content)

			if (parsed) {
				const stats = fs.statSync(filePath)
				schemas.push({
					name: parsed.name,
					apiId: parsed.name.toLowerCase(),
					fieldCount: parsed.fields.length,
					hasVersioning: parsed.options?.versioning ?? true,
					hasI18n: parsed.options?.i18n ?? true,
					createdAt: stats.birthtime,
					updatedAt: stats.mtime,
				})
			}
		}

		return schemas
	}

	/**
	 * Get a schema by name
	 */
	async getSchema(name: string): Promise<SchemaDetailDto | null> {
		const modulesDir = this.getModulesDir()
		const lowerName = name.toLowerCase()

		// Check module directory first
		const schemaFile = path.join(
			modulesDir,
			lowerName,
			`${lowerName}.schema.ts`,
		)
		// Also check schemas subfolder
		const schemaFileAlt = path.join(
			modulesDir,
			lowerName,
			'schemas',
			`${lowerName}.schema.ts`,
		)

		const filePath = fs.existsSync(schemaFile)
			? schemaFile
			: fs.existsSync(schemaFileAlt)
				? schemaFileAlt
				: null

		if (!filePath) {
			return null
		}

		const content = fs.readFileSync(filePath, 'utf-8')
		const parsed = this.parseSchemaFile(content)

		if (!parsed) {
			return null
		}

		return {
			name: parsed.name,
			apiId: parsed.name.toLowerCase(),
			options: parsed.options || { versioning: true, i18n: true },
			fields: parsed.fields,
			generatedCode: content,
		}
	}

	/**
	 * Check if a schema/module already exists
	 */
	schemaExists(name: string): boolean {
		const modulesDir = this.getModulesDir()
		const lowerName = name.toLowerCase()
		const moduleDir = path.join(modulesDir, lowerName)
		return fs.existsSync(moduleDir)
	}

	/**
	 * Create a new module with all files (schema, controller, service, module, dto)
	 */
	async createModule(dto: CreateSchemaDto): Promise<CreateModuleResponseDto> {
		const modulesDir = this.getModulesDir()
		const lowerName = dto.name.toLowerCase()
		const moduleDir = path.join(modulesDir, lowerName)
		const dtoDir = path.join(moduleDir, 'dto')

		// Create directories
		fs.mkdirSync(dtoDir, { recursive: true })

		const createdFiles: string[] = []

		// Generate schema code first (needed for return value)
		const schemaCode = this.generateSchemaCode(dto)

		// Generate and write all files
		const files = [
			{ name: `${lowerName}.schema.ts`, content: schemaCode },
			{
				name: `${lowerName}.module.ts`,
				content: this.generateModuleCode(dto.name),
			},
			{
				name: `${lowerName}.controller.ts`,
				content: this.generateControllerCode(dto.name),
			},
			{
				name: `${lowerName}.service.ts`,
				content: this.generateServiceCode(dto.name),
			},
			{
				name: `dto/create-${lowerName}.dto.ts`,
				content: this.generateDtoCode(dto.name, dto.fields),
			},
		]

		for (const file of files) {
			const filePath = path.join(moduleDir, file.name)
			fs.writeFileSync(filePath, file.content, 'utf-8')
			createdFiles.push(filePath)
			this.logger.log(`Created: ${filePath}`)
		}

		return {
			name: dto.name,
			apiId: lowerName,
			options: dto.options || { versioning: true, i18n: true },
			fields: dto.fields,
			generatedCode: schemaCode,
			createdFiles,
			message: `Module "${dto.name}" created successfully. Import ${dto.name}Module in your app.module.ts to use it.`,
		}
	}

	/**
	 * Update only the schema file for an existing module
	 */
	async updateSchema(
		name: string,
		dto: CreateSchemaDto,
	): Promise<{ detail: SchemaDetailDto; conflicts: ConflictInfo[] }> {
		const modulesDir = this.getModulesDir()
		const lowerName = name.toLowerCase()

		// Find existing schema file
		const schemaFile = path.join(
			modulesDir,
			lowerName,
			`${lowerName}.schema.ts`,
		)
		const schemaFileAlt = path.join(
			modulesDir,
			lowerName,
			'schemas',
			`${lowerName}.schema.ts`,
		)

		const filePath = fs.existsSync(schemaFile)
			? schemaFile
			: fs.existsSync(schemaFileAlt)
				? schemaFileAlt
				: null

		if (!filePath) {
			throw new Error(`Schema "${name}" not found`)
		}

		// Get existing schema for conflict detection
		const existingContent = fs.readFileSync(filePath, 'utf-8')
		const existingParsed = this.parseSchemaFile(existingContent)
		const conflicts = existingParsed
			? this.detectConflicts(existingParsed.fields, dto.fields)
			: []

		// Generate and write new schema code
		const newCode = this.generateSchemaCode(dto)
		fs.writeFileSync(filePath, newCode, 'utf-8')
		this.logger.log(`Schema updated: ${filePath}`)

		return {
			detail: {
				name: dto.name,
				apiId: dto.name.toLowerCase(),
				options: dto.options || { versioning: true, i18n: true },
				fields: dto.fields,
				generatedCode: newCode,
			},
			conflicts,
		}
	}

	/**
	 * Detect conflicts between existing and updated schema fields
	 */
	detectConflicts(
		existing: SchemaFieldDto[],
		updated: SchemaFieldDto[],
	): ConflictInfo[] {
		const conflicts: ConflictInfo[] = []

		for (const updatedField of updated) {
			const existingField = existing.find((f) => f.name === updatedField.name)

			if (existingField) {
				// Check for type changes
				if (existingField.tsType !== updatedField.tsType) {
					conflicts.push({
						fieldName: updatedField.name,
						type: 'type_change',
						message: `Type changed from "${existingField.tsType}" to "${updatedField.tsType}". Update your DTO accordingly.`,
						oldValue: existingField.tsType,
						newValue: updatedField.tsType,
					})
				}

				// Check for required to optional change
				if (existingField.prop.required && !updatedField.prop.required) {
					conflicts.push({
						fieldName: updatedField.name,
						type: 'required_change',
						message:
							'Field changed from required to optional. Consider updating your DTO.',
						oldValue: 'required',
						newValue: 'optional',
					})
				}
			}
		}

		// Check for removed fields
		for (const existingField of existing) {
			const stillExists = updated.find((f) => f.name === existingField.name)
			if (!stillExists) {
				conflicts.push({
					fieldName: existingField.name,
					type: 'field_removed',
					message: `Field "${existingField.name}" was removed. Update your DTO and service accordingly.`,
					oldValue: existingField.name,
					newValue: undefined,
				})
			}
		}

		return conflicts
	}

	/**
	 * Delete a schema file (not the whole module)
	 */
	async deleteSchema(name: string): Promise<boolean> {
		const modulesDir = this.getModulesDir()
		const lowerName = name.toLowerCase()

		const schemaFile = path.join(
			modulesDir,
			lowerName,
			`${lowerName}.schema.ts`,
		)
		const schemaFileAlt = path.join(
			modulesDir,
			lowerName,
			'schemas',
			`${lowerName}.schema.ts`,
		)

		const filePath = fs.existsSync(schemaFile)
			? schemaFile
			: fs.existsSync(schemaFileAlt)
				? schemaFileAlt
				: null

		if (!filePath) {
			return false
		}

		fs.unlinkSync(filePath)
		this.logger.log(`Schema deleted: ${filePath}`)
		return true
	}

	/**
	 * Generate code preview without saving
	 */
	previewCode(dto: CreateSchemaDto): CodePreviewDto {
		const code = this.generateSchemaCode(dto)
		const json = this.generateSchemaJSON(dto)

		return { code, json }
	}

	// ============================================================================
	// Code Generation Methods
	// ============================================================================

	/**
	 * Generate module.ts code
	 */
	private generateModuleCode(name: string): string {
		const lowerName = name.toLowerCase()
		return `import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { ${name}Controller } from './${lowerName}.controller'
import { ${name}Service } from './${lowerName}.service'
import { ${name} } from './${lowerName}.schema'

@Module({
	imports: [MagnetModule.forFeature(${name})],
	controllers: [${name}Controller],
	providers: [${name}Service],
})
export class ${name}Module {}
`
	}

	/**
	 * Generate controller.ts code
	 */
	private generateControllerCode(name: string): string {
		const lowerName = name.toLowerCase()
		return `import { Resolve } from '@magnet-cms/common'
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
} from '@nestjs/common'
import { Create${name}Dto } from './dto/create-${lowerName}.dto'
import { ${name}Service } from './${lowerName}.service'
import { ${name} } from './${lowerName}.schema'

@Controller('${lowerName}')
export class ${name}Controller {
	constructor(private readonly ${lowerName}Service: ${name}Service) {}

	@Post()
	@Resolve(() => ${name})
	create(@Body() dto: Create${name}Dto) {
		return this.${lowerName}Service.create(dto)
	}

	@Get()
	@Resolve(() => [${name}])
	findAll() {
		return this.${lowerName}Service.findAll()
	}

	@Get(':id')
	@Resolve(() => ${name})
	findOne(@Param('id') id: string) {
		return this.${lowerName}Service.findOne(id)
	}

	@Put(':id')
	@Resolve(() => Boolean)
	update(@Param('id') id: string, @Body() dto: Create${name}Dto) {
		return this.${lowerName}Service.update(id, dto)
	}

	@Delete(':id')
	@Resolve(() => Boolean)
	remove(@Param('id') id: string) {
		return this.${lowerName}Service.remove(id)
	}
}
`
	}

	/**
	 * Generate service.ts code
	 */
	private generateServiceCode(name: string): string {
		const lowerName = name.toLowerCase()
		return `import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { Create${name}Dto } from './dto/create-${lowerName}.dto'
import { ${name} } from './${lowerName}.schema'

@Injectable()
export class ${name}Service {
	constructor(
		@InjectModel(${name})
		private model: Model<${name}>,
	) {}

	create(dto: Create${name}Dto) {
		return this.model.create(dto)
	}

	findAll() {
		return this.model.find()
	}

	findOne(id: string) {
		return this.model.findById(id)
	}

	update(id: string, dto: Create${name}Dto) {
		return this.model.update(id, dto)
	}

	remove(id: string) {
		return this.model.delete(id)
	}
}
`
	}

	/**
	 * Generate DTO code
	 */
	private generateDtoCode(name: string, fields: SchemaFieldDto[]): string {
		const validatorImports = new Set<string>()

		// Collect validator imports
		for (const field of fields) {
			// Add type validators based on field type
			switch (field.tsType) {
				case 'string':
					validatorImports.add('IsString')
					break
				case 'number':
					validatorImports.add('IsNumber')
					break
				case 'boolean':
					validatorImports.add('IsBoolean')
					break
				case 'Date':
					validatorImports.add('IsDate')
					break
			}

			if (field.prop.required) {
				validatorImports.add('IsNotEmpty')
			} else {
				validatorImports.add('IsOptional')
			}

			// Add specific validators from field validations
			for (const v of field.validations) {
				validatorImports.add(v.type)
			}
		}

		const imports = Array.from(validatorImports).sort().join(',\n\t')
		const properties = fields
			.map((f) => this.generateDtoProperty(f))
			.join('\n\n')

		return `import {
	${imports},
} from 'class-validator'

export class Create${name}Dto {
${properties}
}
`
	}

	/**
	 * Generate a single DTO property with decorators
	 */
	private generateDtoProperty(field: SchemaFieldDto): string {
		const decorators: string[] = []
		const indent = '\t'

		// Type validator
		switch (field.tsType) {
			case 'string':
				decorators.push(`${indent}@IsString()`)
				break
			case 'number':
				decorators.push(`${indent}@IsNumber()`)
				break
			case 'boolean':
				decorators.push(`${indent}@IsBoolean()`)
				break
			case 'Date':
				decorators.push(`${indent}@IsDate()`)
				break
		}

		// Required/Optional
		if (field.prop.required) {
			decorators.push(`${indent}@IsNotEmpty()`)
		} else {
			decorators.push(`${indent}@IsOptional()`)
		}

		// Add field-specific validators (Length, Min, Max, etc.)
		for (const v of field.validations) {
			if (
				['IsString', 'IsNumber', 'IsBoolean', 'IsDate', 'IsNotEmpty'].includes(
					v.type,
				)
			) {
				continue // Skip already added validators
			}
			decorators.push(`${indent}@${this.formatValidator(v)}`)
		}

		// Property declaration
		const optional = field.prop.required ? '' : '?'
		const declaration = `${indent}${field.name}${optional}: ${field.tsType}`

		return [...decorators, declaration].join('\n')
	}

	/**
	 * Generate TypeScript schema code from DTO
	 */
	private generateSchemaCode(dto: CreateSchemaDto): string {
		if (!dto.name) {
			return '// Enter a schema name to generate code'
		}

		const imports = this.generateImports(dto.fields)
		const classDecorator = this.generateSchemaDecorator(dto.options)
		const properties = dto.fields
			.map((field) => this.generateFieldCode(field))
			.join('\n\n')

		return `${imports}\n\n${classDecorator}\nexport class ${dto.name} {\n${properties}\n}\n`
	}

	/**
	 * Generate import statements based on used features
	 */
	private generateImports(fields: SchemaFieldDto[]): string {
		const magnetImports = new Set(['Schema', 'Prop', 'UI'])
		const validatorImports = new Set<string>()
		let needsTypeTransformer = false

		for (const field of fields) {
			if (field.validations.length > 0) {
				magnetImports.add('Validators')
				for (const v of field.validations) {
					validatorImports.add(v.type)
				}
			}

			if (field.type === 'date') {
				needsTypeTransformer = true
			}
		}

		const lines: string[] = []

		lines.push(
			`import { ${Array.from(magnetImports).sort().join(', ')} } from '@magnet-cms/common'`,
		)

		if (needsTypeTransformer) {
			lines.push(`import { Type } from 'class-transformer'`)
		}

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
	private generateSchemaDecorator(
		options?: CreateSchemaDto['options'],
	): string {
		const opts: string[] = []

		if (options?.versioning !== undefined) {
			opts.push(`versioning: ${options.versioning}`)
		}
		if (options?.i18n !== undefined) {
			opts.push(`i18n: ${options.i18n}`)
		}

		if (opts.length === 0) {
			return '@Schema()'
		}

		return `@Schema({ ${opts.join(', ')} })`
	}

	/**
	 * Generate code for a single field
	 */
	private generateFieldCode(field: SchemaFieldDto): string {
		const decorators: string[] = []
		const indent = '\t'

		// @Type() decorator for Date fields
		if (field.type === 'date') {
			decorators.push(`${indent}@Type(() => Date)`)
		}

		// @Prop() decorator
		decorators.push(`${indent}@Prop(${this.generatePropOptions(field)})`)

		// @Validators() decorator
		if (field.validations.length > 0) {
			const validators = field.validations
				.map((v) => this.formatValidator(v))
				.join(', ')
			decorators.push(`${indent}@Validators(${validators})`)
		}

		// @UI() decorator
		decorators.push(`${indent}@UI(${this.generateUIOptions(field)})`)

		// Property declaration
		const declaration = `${indent}${field.name}: ${field.tsType}`

		return [...decorators, declaration].join('\n')
	}

	/**
	 * Generate @Prop() options object
	 */
	private generatePropOptions(field: SchemaFieldDto): string {
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
	private generateUIOptions(field: SchemaFieldDto): string {
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
			options.push(`label: '${this.escapeString(field.ui.label)}'`)
		}
		if (field.ui.description) {
			options.push(`description: '${this.escapeString(field.ui.description)}'`)
		}
		if (field.ui.placeholder) {
			options.push(`placeholder: '${this.escapeString(field.ui.placeholder)}'`)
		}
		if (field.ui.row) {
			options.push('row: true')
		}
		if (field.ui.options && field.ui.options.length > 0) {
			const optionsStr = field.ui.options
				.map(
					(o) =>
						`{ key: '${this.escapeString(o.key)}', value: '${this.escapeString(o.value)}' }`,
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
	private formatValidator(rule: ValidationRuleDto): string {
		if (!rule.constraints || rule.constraints.length === 0) {
			return `${rule.type}()`
		}

		const args = rule.constraints
			.map((c) => {
				if (typeof c === 'string') {
					if (rule.type === 'Matches') {
						return c.startsWith('/') ? c : `/${c}/`
					}
					return `'${this.escapeString(String(c))}'`
				}
				return String(c)
			})
			.join(', ')

		return `${rule.type}(${args})`
	}

	/**
	 * Escape string for use in generated code
	 */
	private escapeString(str: string): string {
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
	private generateSchemaJSON(dto: CreateSchemaDto): object {
		return {
			name: dto.name,
			options: {
				versioning: dto.options?.versioning ?? true,
				i18n: dto.options?.i18n ?? true,
			},
			properties: dto.fields.map((field) => ({
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
	 * Parse a schema file content to extract metadata
	 */
	private parseSchemaFile(content: string): {
		name: string
		options?: { versioning?: boolean; i18n?: boolean }
		fields: SchemaFieldDto[]
	} | null {
		try {
			// Extract class name
			const classMatch = content.match(/export\s+class\s+(\w+)/)
			if (!classMatch?.[1]) return null

			const name = classMatch[1]

			// Extract @Schema() options
			const schemaMatch = content.match(/@Schema\(\{([^}]*)\}\)/)
			const options: { versioning?: boolean; i18n?: boolean } = {}
			if (schemaMatch?.[1]) {
				const optionsStr = schemaMatch[1]
				if (optionsStr.includes('versioning: true')) options.versioning = true
				if (optionsStr.includes('versioning: false')) options.versioning = false
				if (optionsStr.includes('i18n: true')) options.i18n = true
				if (optionsStr.includes('i18n: false')) options.i18n = false
			}

			// Extract fields (basic extraction)
			const fields: SchemaFieldDto[] = []
			const fieldRegex =
				/@Prop\(([^)]*)\)[^@]*@UI\(([^)]*)\)[^:]*(\w+):\s*(\w+)/g
			let fieldMatch: RegExpExecArray | null = fieldRegex.exec(content)

			while (fieldMatch !== null) {
				const propStr = fieldMatch[1]
				const uiStr = fieldMatch[2]
				const fieldName = fieldMatch[3]
				const tsType = fieldMatch[4]

				if (propStr !== undefined && uiStr && fieldName && tsType) {
					fields.push({
						name: fieldName,
						displayName: fieldName,
						type: this.inferFieldType(tsType, uiStr),
						tsType,
						prop: {
							required: propStr.includes('required: true'),
							unique: propStr.includes('unique: true'),
							intl: propStr.includes('intl: true'),
						},
						ui: this.parseUIOptions(uiStr),
						validations: [],
					})
				}

				fieldMatch = fieldRegex.exec(content)
			}

			return { name, options, fields }
		} catch (error) {
			this.logger.error('Failed to parse schema file', error)
			return null
		}
	}

	/**
	 * Infer field type from TypeScript type and UI options
	 */
	private inferFieldType(
		tsType: string,
		uiStr: string,
	): SchemaFieldDto['type'] {
		if (uiStr.includes("type: 'switch'") || uiStr.includes("type: 'checkbox'"))
			return 'boolean'
		if (uiStr.includes("type: 'date'")) return 'date'
		if (uiStr.includes("type: 'number'")) return 'number'
		if (uiStr.includes("type: 'select'") || uiStr.includes("type: 'radio'"))
			return 'select'
		if (uiStr.includes("type: 'relationship'")) return 'relation'

		const lowerType = tsType.toLowerCase()
		if (lowerType === 'number') return 'number'
		if (lowerType === 'boolean') return 'boolean'
		if (lowerType === 'date') return 'date'

		return 'text'
	}

	/**
	 * Parse UI options from string
	 */
	private parseUIOptions(uiStr: string): SchemaFieldDto['ui'] {
		const ui: SchemaFieldDto['ui'] = {}

		const tabMatch = uiStr.match(/tab:\s*'([^']*)'/)
		if (tabMatch) ui.tab = tabMatch[1]

		const typeMatch = uiStr.match(/type:\s*'([^']*)'/)
		if (typeMatch) ui.type = typeMatch[1]

		const labelMatch = uiStr.match(/label:\s*'([^']*)'/)
		if (labelMatch) ui.label = labelMatch[1]

		const descMatch = uiStr.match(/description:\s*'([^']*)'/)
		if (descMatch) ui.description = descMatch[1]

		if (uiStr.includes('side: true')) ui.side = true
		if (uiStr.includes('row: true')) ui.row = true

		return ui
	}
}
