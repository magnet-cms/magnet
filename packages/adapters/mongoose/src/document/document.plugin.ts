import { Injectable, Logger } from '@nestjs/common'
import { Schema } from 'mongoose'
import type { DocumentPluginOptions } from './document.interface'

@Injectable()
export class DocumentPluginService {
	private readonly logger = new Logger(DocumentPluginService.name)

	/**
	 * Apply the document plugin to a Mongoose schema
	 * Adds documentId, locale, status fields and compound indexes
	 * @param schema The Mongoose schema to apply the plugin to
	 * @param options Plugin options
	 */
	applyDocumentPlugin(schema: Schema, options: DocumentPluginOptions): void {
		if (!options.hasIntl) {
			return
		}

		this.logger.log('Applying document plugin to schema')

		// Add document fields
		this.addDocumentFields(schema)

		// Add compound indexes
		this.addIndexes(schema)

		// Add methods
		this.addMethods(schema)
	}

	/**
	 * Add document-related fields to the schema
	 */
	private addDocumentFields(schema: Schema): void {
		schema.add({
			documentId: {
				type: String,
				required: true,
				index: true,
			},
			locale: {
				type: String,
				required: true,
				default: 'en',
			},
			status: {
				type: String,
				enum: ['draft', 'published'],
				required: true,
				default: 'draft',
			},
			publishedAt: {
				type: Date,
				default: null,
			},
		})
	}

	/**
	 * Add compound indexes for efficient querying
	 */
	private addIndexes(schema: Schema): void {
		// Compound index for finding a specific document variant
		schema.index(
			{ documentId: 1, locale: 1, status: 1 },
			{ unique: true, name: 'document_locale_status_unique' },
		)

		// Index for listing all locales of a document
		schema.index({ documentId: 1, locale: 1 }, { name: 'document_locale' })

		// Index for listing all documents by status
		schema.index({ status: 1, locale: 1 }, { name: 'status_locale' })

		// Convert unique indexes to partial unique indexes for i18n support
		this.convertUniqueIndexes(schema)
	}

	/**
	 * Convert simple unique indexes to partial unique indexes for i18n support
	 * This allows different locales of the same document to share unique field values
	 * while still enforcing uniqueness across different documents
	 */
	private convertUniqueIndexes(schema: Schema): void {
		const fieldsToConvert: string[] = []
		const indexesToAdd: Array<{ fields: Record<string, 1 | -1>; options: Record<string, unknown> }> = []

		// Iterate over schema paths to find unique fields
		schema.eachPath((pathName, schemaType) => {
			// Skip system fields
			if (['documentId', 'locale', 'status', 'publishedAt', '_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'].includes(pathName)) {
				return
			}

			// Check if this field has unique: true OR has a unique index defined
			const hasUniqueOption = schemaType.options?.unique === true
			const hasUniqueIndex = (schemaType as any)._index?.unique === true

			if (hasUniqueOption || hasUniqueIndex) {
				this.logger.log(`Converting unique index on '${pathName}' to partial unique index for i18n support`)

				// Remove the unique constraint from the field definition
				if (schemaType.options) {
					schemaType.options.unique = false
					schemaType.options.index = false
				}

				// Remove the internal _index property that Mongoose uses to create indexes
				// This is where Mongoose stores index definitions from path options
				;(schemaType as any)._index = undefined

				// Track this field for index removal
				fieldsToConvert.push(pathName)

				// Add a partial unique index that only applies to the default locale AND draft status
				// This ensures uniqueness across different documents while allowing:
				// - Same-document locale copies (different locales can share tagID)
				// - Same-document draft/published copies (published can have same tagID as draft)
				indexesToAdd.push({
					fields: { [pathName]: 1 as const },
					options: {
						unique: true,
						name: `${pathName}_unique_i18n`,
						partialFilterExpression: {
							locale: 'en',
							status: 'draft',
						},
					},
				})
			}
		})

		// Remove existing unique index definitions for these fields from the schema
		// Mongoose stores indexes in a private _indexes array
		const schemaIndexes = (schema as any)._indexes as Array<[Record<string, unknown>, Record<string, unknown>]> | undefined
		if (schemaIndexes && Array.isArray(schemaIndexes)) {
			// Filter out single-field unique indexes for fields we're converting
			const filteredIndexes = schemaIndexes.filter(([fields, options]) => {
				const fieldKeys = Object.keys(fields)
				// Keep if it's not a single-field index
				if (fieldKeys.length !== 1) return true
				const fieldName = fieldKeys[0] as string
				// Keep if it's not one of our fields to convert
				if (!fieldsToConvert.includes(fieldName)) return true
				// Remove if it's a unique index on one of our fields
				if (options?.unique === true) {
					this.logger.log(`Removing original unique index definition for '${fieldName}'`)
					return false
				}
				return true
			})
			;(schema as any)._indexes = filteredIndexes
		}

		// Add the new partial unique indexes
		for (const index of indexesToAdd) {
			schema.index(index.fields, index.options)
		}
	}

	/**
	 * Add helper methods to the schema
	 */
	private addMethods(schema: Schema): void {
		// Method to check if this is a draft
		schema.method('isDraft', function () {
			return this.status === 'draft'
		})

		// Method to check if this is published
		schema.method('isPublished', function () {
			return this.status === 'published'
		})

		// Static method to find by document ID
		schema.static('findByDocumentId', function (documentId: string, options: { locale?: string; status?: string } = {}) {
			const query: Record<string, any> = { documentId }

			if (options.locale) {
				query.locale = options.locale
			}

			if (options.status) {
				query.status = options.status
			}

			return this.find(query)
		})

		// Static method to find a single document variant
		schema.static('findOneByDocumentId', function (documentId: string, locale: string, status: 'draft' | 'published') {
			return this.findOne({ documentId, locale, status })
		})
	}
}
