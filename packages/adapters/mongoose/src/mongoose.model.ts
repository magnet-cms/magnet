import { randomBytes } from 'node:crypto'
import {
	BaseSchema,
	DocumentNotFoundError,
	Model,
	ModelCreateOptions,
	ModelUpdateOptions,
	type NativeAccess,
	type SchemaMetadata,
	type VersionDocument,
	fromMongooseError,
	getSchemaOptions,
	isCastError,
	isVersionDocument,
} from '@magnet-cms/common'
import { Document, Model as MongooseModel } from 'mongoose'
import { MongooseQueryBuilder } from '~/mongoose.query-builder'
import { mapDocumentId, mapQueryId } from '~/utils'

/**
 * Generate a cryptographically secure random document ID
 */
function generateDocumentId(length = 24): string {
	const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
	const bytes = randomBytes(length)
	let result = ''
	for (let i = 0; i < length; i++) {
		const byte = bytes[i]
		if (byte !== undefined) {
			result += ALPHABET[byte % ALPHABET.length]
		}
	}
	return result
}

export function createModel<T>(
	modelInstance:
		| MongooseModel<Document & BaseSchema<T>>
		| (() => Promise<MongooseModel<Document & BaseSchema<T>>>),
) {
	return class MongooseModelAdapter extends Model<T> {
		/** @internal */
		_modelInstance:
			| MongooseModel<Document & BaseSchema<T>>
			| (() => Promise<MongooseModel<Document & BaseSchema<T>>>)
		/** @internal */
		_model?: MongooseModel<Document & BaseSchema<T>>
		/** @internal */
		_modelPromise?: Promise<MongooseModel<Document & BaseSchema<T>>>
		currentLocale?: string
		currentVersion?: string
		versionModel?: MongooseModel<Document>

		constructor() {
			super()
			this._modelInstance = modelInstance
		}

		/**
		 * Lazy-load the Mongoose model
		 * If modelInstance is a function, call it to get the model (with retry logic)
		 * If modelInstance is already a model, return it directly
		 * @internal
		 */
		async _ensureModel(): Promise<MongooseModel<Document & BaseSchema<T>>> {
			// If already initialized, return it
			if (this._model) return this._model

			// If currently initializing, return the existing promise
			if (this._modelPromise) return this._modelPromise

			// Start initialization
			const promise: Promise<MongooseModel<Document & BaseSchema<T>>> =
				(async () => {
					// If it's already a model instance, use it
					if (typeof this._modelInstance !== 'function') {
						this._model = this._modelInstance as MongooseModel<
							Document & BaseSchema<T>
						>
						return this._model
					}

					// It's a factory function - call it with retry logic
					const factory = this._modelInstance as () => Promise<
						MongooseModel<Document & BaseSchema<T>>
					>
					let lastError: unknown

					// Try up to 10 times with 100ms delay between attempts
					for (let attempt = 0; attempt < 10; attempt++) {
						try {
							this._model = await factory()
							return this._model
						} catch (error) {
							lastError = error
							// Wait before retry
							await new Promise((resolve) => setTimeout(resolve, 100))
						}
					}

					// If all retries failed, throw the last error
					throw new Error(
						`Failed to initialize model after 10 attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
					)
				})()

			this._modelPromise = promise
			return promise
		}

		/**
		 * Get the model synchronously (for non-async contexts)
		 * Returns the cached model or throws if not initialized
		 * @internal
		 */
		get _modelSync(): MongooseModel<Document & BaseSchema<T>> {
			if (!this._model) {
				throw new Error(
					'Model not initialized. Ensure model is ready before use.',
				)
			}
			return this._model
		}

		/**
		 * Set the locale for subsequent operations
		 * @param locale The locale to use
		 */
		locale(locale: string): this {
			const clone = Object.create(Object.getPrototypeOf(this))
			Object.assign(clone, this)
			clone.currentLocale = locale
			return clone
		}

		/**
		 * Get the current locale
		 */
		getLocale(): string {
			return this.currentLocale ?? 'en'
		}

		/**
		 * Set the version for subsequent operations
		 * @param versionId The version ID or status ('draft', 'published', 'archived')
		 */
		version(versionId: string): this {
			const clone = Object.create(Object.getPrototypeOf(this))
			Object.assign(clone, this)
			clone.currentVersion = versionId
			return clone
		}

		/**
		 * Check if versioning is enabled for this model
		 * Auto-versioning is disabled - versioning is handled explicitly by HistoryService
		 */
		isVersioningEnabled(): boolean {
			return false
		}

		/**
		 * Get the version model
		 */
		async getVersionModel(): Promise<MongooseModel<Document> | undefined> {
			if (this.versionModel) return this.versionModel

			try {
				const model = await this._ensureModel()
				// Try to get the Version model from mongoose
				this.versionModel = model.db.model<Document>('History')
				return this.versionModel
			} catch (error) {
				console.error('Error getting Version model:', error)
				return undefined
			}
		}

		/**
		 * Apply locale to a document or array of documents
		 * @param doc Document or array of documents to apply locale to
		 * @returns Document or array of documents with locale applied
		 */
		applyLocale<D>(doc: D): D {
			if (!this.currentLocale) return doc

			// If it's an array, apply locale to each document
			if (Array.isArray(doc)) {
				return doc.map((item) => this.applyLocale(item)) as unknown as D
			}

			// If it's a document with setLocale method, apply locale
			if (
				doc &&
				typeof doc === 'object' &&
				'setLocale' in doc &&
				typeof doc.setLocale === 'function'
			) {
				return doc.setLocale(this.currentLocale) as unknown as D
			}

			return doc
		}

		/**
		 * Find all versions of a document
		 * @param documentId The document ID
		 */
		async findVersions(documentId: string): Promise<VersionDocument[]> {
			const model = await this._ensureModel()
			const versionModel = await this.getVersionModel()
			if (!versionModel) return []

			const results = await versionModel
				.find({
					documentId,
					schemaName: model.modelName,
				})
				.lean()

			return (results as unknown[]).filter(isVersionDocument)
		}

		/**
		 * Find a specific version by ID
		 * @param versionId The version ID
		 */
		async findVersionById(versionId: string): Promise<VersionDocument | null> {
			const versionModel = await this.getVersionModel()
			if (!versionModel) return null

			const result = await versionModel.findOne({ versionId }).lean()
			if (!result || !isVersionDocument(result)) return null
			return result
		}

		/**
		 * Restore a version
		 * @param versionId The version ID to restore
		 */
		async restoreVersion(versionId: string): Promise<BaseSchema<T> | null> {
			const versionModel = await this.getVersionModel()
			if (!versionModel) return null

			// Find the version
			const version = await this.findVersionById(versionId)
			if (!version) return null
			// Update the document with the version data
			return this.update(
				{ id: version.documentId } as Partial<BaseSchema<T>>,
				version.data as Partial<BaseSchema<T>>,
			)
		}

		/**
		 * Create a version of a document
		 * @param documentId Document ID
		 * @param data Document data
		 * @param status Version status
		 */
		async createVersion(
			documentId: string,
			data: Partial<BaseSchema<T>>,
			status: 'draft' | 'published' | 'archived' = 'draft',
		): Promise<VersionDocument | null> {
			const model = await this._ensureModel()
			const versionModel = await this.getVersionModel()
			if (!versionModel) return null

			// Generate a unique version ID
			const versionId = `${documentId}_${Date.now()}`

			// Create the version
			const created = await versionModel.create({
				documentId,
				versionId,
				schemaName: model.modelName,
				status,
				data,
				createdAt: new Date(),
			})

			const result = created.toObject()
			if (!isVersionDocument(result)) return null
			return result
		}

		async create(
			data: Partial<BaseSchema<T>>,
			options?: ModelCreateOptions,
		): Promise<BaseSchema<T>> {
			try {
				const model = await this._ensureModel()
				// Check if schema has documentId field (i18n enabled)
				const hasDocumentIdField = model.schema.paths.documentId !== undefined

				// Generate documentId if not provided and schema requires it
				const createData: Record<string, unknown> = { ...data }
				if (hasDocumentIdField && !createData.documentId) {
					createData.documentId = generateDocumentId()
				}

				// Ensure locale and status have defaults if schema requires them
				if (hasDocumentIdField) {
					if (!createData.locale) {
						createData.locale = this.currentLocale || 'en'
					}
					if (!createData.status) {
						createData.status = 'draft'
					}
				}

				let createdDoc: { toObject(): unknown }

				if (options?.skipValidation) {
					// Create document without validation (for drafts)
					const doc = new model(createData)
					createdDoc = await doc.save({ validateBeforeSave: false })
				} else {
					// Normal create with validation
					createdDoc = await model.create(createData)
				}

				const mappedDoc = mapDocumentId<T>(createdDoc.toObject())

				// If versioning is enabled, create a version
				if (this.isVersioningEnabled()) {
					await this.createVersion(mappedDoc.id, mappedDoc, 'published')
				}

				return this.applyLocale(mappedDoc) as BaseSchema<T>
			} catch (error: unknown) {
				const model = await this._ensureModel()
				// Convert Mongoose errors to typed MagnetErrors
				throw fromMongooseError(error, {
					schema: model.modelName,
					operation: 'create',
				})
			}
		}

		async find(): Promise<BaseSchema<T>[]> {
			const model = await this._ensureModel()
			// If a specific version is requested
			if (this.currentVersion) {
				// If it's a status (draft, published, archived)
				if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
					const versionModel = await this.getVersionModel()
					if (!versionModel) return []

					// Find all documents with the requested status
					const rawVersions = await versionModel
						.find({
							schemaName: model.modelName,
							status: this.currentVersion,
						})
						.lean()

					// Filter to valid version documents and group by documentId
					const validVersions: VersionDocument[] = []
					for (const v of rawVersions) {
						if (isVersionDocument(v)) {
							validVersions.push(v)
						}
					}

					const latestVersions: Record<string, VersionDocument> = {}
					for (const version of validVersions) {
						const existing = latestVersions[version.documentId]
						if (
							!existing ||
							new Date(version.createdAt) > new Date(existing.createdAt)
						) {
							latestVersions[version.documentId] = version
						}
					}

					// Return the data from each latest version
					return Object.values(latestVersions).map((version) =>
						this.applyLocale(version.data as BaseSchema<T>),
					)
				}

				// If it's a specific version ID
				const version = await this.findVersionById(this.currentVersion)
				if (version) {
					return [this.applyLocale(version.data as BaseSchema<T>)]
				}

				return []
			}

			// Normal find operation
			const results = await model.find().lean()
			const mappedResults = results.map((result) => mapDocumentId<T>(result))
			return this.applyLocale(mappedResults) as BaseSchema<T>[]
		}

		async findById(id: string): Promise<BaseSchema<T> | null> {
			const model = await this._ensureModel()
			// If a specific version is requested
			if (this.currentVersion) {
				// If it's a status (draft, published, archived)
				if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
					const versionModel = await this.getVersionModel()
					if (!versionModel) return null

					// Find the latest version with the requested status
					const rawVersions = await versionModel
						.find({
							documentId: id,
							schemaName: model.modelName,
							status: this.currentVersion,
						})
						.sort({ createdAt: -1 })
						.limit(1)
						.lean()

					if (rawVersions.length > 0) {
						const version = rawVersions[0]
						if (isVersionDocument(version)) {
							return this.applyLocale(version.data as BaseSchema<T>)
						}
					}

					return null
				}

				// If it's a specific version ID
				const version = await this.findVersionById(this.currentVersion)
				if (version && version.documentId === id) {
					return this.applyLocale(version.data as BaseSchema<T>)
				}

				return null
			}

			// Normal findById operation
			const result = await model.findById(id).lean()
			if (!result) return null
			const mappedResult = mapDocumentId<T>(result)
			return this.applyLocale(mappedResult) as BaseSchema<T>
		}

		async findOne(
			query: Partial<BaseSchema<T>>,
		): Promise<BaseSchema<T> | null> {
			const model = await this._ensureModel()
			// If a specific version is requested
			if (this.currentVersion) {
				// If it's a status (draft, published, archived)
				if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
					const versionModel = await this.getVersionModel()
					if (!versionModel) return null

					// First find the document ID that matches the query
					const doc = await model.findOne(mapQueryId(query)).lean()
					if (!doc) return null

					const docId = doc._id?.toString()
					if (!docId) return null

					// Find the latest version with the requested status
					const rawVersions = await versionModel
						.find({
							documentId: docId,
							schemaName: model.modelName,
							status: this.currentVersion,
						})
						.sort({ createdAt: -1 })
						.limit(1)
						.lean()

					if (rawVersions.length > 0) {
						const version = rawVersions[0]
						if (isVersionDocument(version)) {
							return this.applyLocale(version.data as BaseSchema<T>)
						}
					}

					return null
				}

				// If it's a specific version ID
				const version = await this.findVersionById(this.currentVersion)
				if (version) {
					// Check if the version data matches the query
					const versionData = version.data as Record<string, unknown>
					let matches = true

					for (const key in query) {
						if (key === 'id' && query[key] !== version.documentId) {
							matches = false
							break
						}

						const queryValue = query[key as keyof typeof query]
						if (key !== 'id' && versionData[key] !== queryValue) {
							matches = false
							break
						}
					}

					if (matches) {
						return this.applyLocale(versionData as BaseSchema<T>)
					}
				}

				return null
			}

			// Normal findOne operation
			try {
				const result = await model.findOne(mapQueryId(query)).lean()
				if (!result) return null
				const mappedResult = mapDocumentId<T>(result)
				return this.applyLocale(mappedResult) as BaseSchema<T>
			} catch (error: unknown) {
				// Handle CastError when trying to find by id with non-ObjectId value
				if (isCastError(error) && error.path === '_id') {
					return null
				}
				throw error
			}
		}

		async findMany(query: Partial<BaseSchema<T>>): Promise<BaseSchema<T>[]> {
			const model = await this._ensureModel()
			// If a specific version is requested
			if (this.currentVersion) {
				// If it's a status (draft, published, archived)
				if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
					const versionModel = await this.getVersionModel()
					if (!versionModel) return []

					// First find all document IDs that match the query
					const docs = await model.find(mapQueryId(query)).lean()
					if (docs.length === 0) return []

					const docIds = docs
						.map((doc) => doc._id?.toString())
						.filter((id): id is string => Boolean(id))

					// Find all versions with the requested status for these documents
					const rawVersions = await versionModel
						.find({
							documentId: { $in: docIds },
							schemaName: model.modelName,
							status: this.currentVersion,
						})
						.lean()

					// Filter to valid version documents and group by documentId
					const validVersions: VersionDocument[] = []
					for (const v of rawVersions) {
						if (isVersionDocument(v)) {
							validVersions.push(v)
						}
					}

					const latestVersions: Record<string, VersionDocument> = {}
					for (const version of validVersions) {
						const existing = latestVersions[version.documentId]
						if (
							!existing ||
							new Date(version.createdAt) > new Date(existing.createdAt)
						) {
							latestVersions[version.documentId] = version
						}
					}

					// Return the data from each latest version
					return Object.values(latestVersions).map((version) =>
						this.applyLocale(version.data as BaseSchema<T>),
					)
				}

				// If it's a specific version ID
				const version = await this.findVersionById(this.currentVersion)
				if (version) {
					// Check if the version data matches the query
					const versionData = version.data as Record<string, unknown>
					let matches = true

					for (const key in query) {
						if (key === 'id' && query[key] !== version.documentId) {
							matches = false
							break
						}

						const queryValue = query[key as keyof typeof query]
						if (key !== 'id' && versionData[key] !== queryValue) {
							matches = false
							break
						}
					}

					if (matches) {
						return [this.applyLocale(versionData as BaseSchema<T>)]
					}
				}

				return []
			}

			// Normal findMany operation
			try {
				const results = await model.find(mapQueryId(query)).lean()
				const mappedResults = results.map((result) => mapDocumentId<T>(result))
				return this.applyLocale(mappedResults) as BaseSchema<T>[]
			} catch (error: unknown) {
				// Handle CastError when trying to find by id with non-ObjectId value
				if (isCastError(error) && error.path === '_id') {
					return []
				}
				throw error
			}
		}

		async update(
			query: Partial<BaseSchema<T>>,
			data: Partial<BaseSchema<T>>,
			options?: ModelUpdateOptions,
		): Promise<BaseSchema<T>> {
			const model = await this._ensureModel()
			const mongooseQuery = mapQueryId(query)
			const mongooseData = mapQueryId(data)

			// If versioning is enabled and we're in draft mode
			if (this.isVersioningEnabled() && this.currentVersion === 'draft') {
				// Find the document first
				const doc = await model.findOne(mongooseQuery).lean()
				if (!doc) {
					throw new DocumentNotFoundError(model.modelName, 'unknown', {
						operation: 'update',
					})
				}

				const docId = doc._id?.toString()
				if (!docId) {
					throw new DocumentNotFoundError(model.modelName, 'unknown', {
						operation: 'update',
					})
				}

				// Create a draft version with the updated data
				const updatedData = { ...mapDocumentId(doc), ...data }
				await this.createVersion(docId, updatedData, 'draft')

				// Return the updated data without actually updating the document
				return updatedData as BaseSchema<T>
			}

			// Handle update with skipValidation option
			if (options?.skipValidation) {
				const doc = await model.findOne(mongooseQuery)
				if (!doc) {
					throw new DocumentNotFoundError(model.modelName, 'unknown', {
						operation: 'update',
					})
				}

				// Update fields manually
				Object.assign(doc, mongooseData)
				await doc.save({ validateBeforeSave: false })

				const mappedResult = mapDocumentId<T>(doc.toObject())
				return this.applyLocale(mappedResult) as BaseSchema<T>
			}

			// Normal update operation
			const result = await model
				.findOneAndUpdate(mongooseQuery, mongooseData, { new: true })
				.lean()

			if (!result) {
				throw new DocumentNotFoundError(model.modelName, 'unknown', {
					operation: 'update',
				})
			}

			const mappedResult = mapDocumentId<T>(result)

			// If versioning is enabled, create a version
			if (this.isVersioningEnabled()) {
				await this.createVersion(mappedResult.id, mappedResult, 'published')
			}

			return this.applyLocale(mappedResult) as BaseSchema<T>
		}

		async delete(query: Partial<BaseSchema<T>>): Promise<boolean> {
			const model = await this._ensureModel()
			// If versioning is enabled and we're in draft mode
			if (this.isVersioningEnabled() && this.currentVersion === 'draft') {
				// Find the document first
				const doc = await model.findOne(mapQueryId(query)).lean()
				if (!doc) return false

				const docId = doc._id?.toString()
				if (!docId) return false

				// Create an archived version
				await this.createVersion(docId, mapDocumentId(doc), 'archived')

				return true
			}

			// Normal delete operation
			const result = await model.findOneAndDelete(mapQueryId(query))

			// If versioning is enabled, create an archived version
			if (result && this.isVersioningEnabled()) {
				const resultId = result._id?.toString()
				if (resultId) {
					await this.createVersion(
						resultId,
						mapDocumentId(result.toObject()),
						'archived',
					)
				}
			}

			return !!result
		}

		/**
		 * Create a query builder for advanced queries with sorting, pagination, and operators.
		 * The query builder inherits the current locale/version context.
		 *
		 * @example
		 * ```typescript
		 * const results = await model.query()
		 *   .where({ status: 'active', age: { $gte: 18 } })
		 *   .sort({ createdAt: -1 })
		 *   .limit(10)
		 *   .exec()
		 * ```
		 */
		query(): MongooseQueryBuilder<T> {
			if (!this._model) {
				throw new Error(
					'Model not initialized. Call an async method first to initialize the model.',
				)
			}
			return new MongooseQueryBuilder<T>(
				this._model,
				this.currentLocale,
				this.currentVersion,
			)
		}

		/**
		 * Get access to the native Mongoose model.
		 * Use with caution - bypasses Magnet abstractions like locale and versioning.
		 *
		 * @returns Typed native access object
		 */
		native(): NativeAccess<T> {
			if (!this._model) {
				throw new Error(
					'Model not initialized. Call an async method first to initialize the model.',
				)
			}
			const model = this._model
			return {
				raw: model,
				adapterName: 'mongoose',
				async rawQuery<R = unknown>(
					query: string,
					_params?: unknown[],
				): Promise<R> {
					// MongoDB uses BSON/aggregation pipeline, not raw string queries
					// Parse the query string as JSON for aggregation pipeline
					const pipeline = JSON.parse(query) as unknown[]
					// Use type assertion for aggregate since we're parsing user-provided JSON
					const result = await (
						model.aggregate as (pipeline: unknown[]) => Promise<unknown[]>
					)(pipeline)
					return result as R
				},
			}
		}

		/**
		 * Get schema name
		 */
		getSchemaName(): string {
			if (!this._model) {
				throw new Error(
					'Model not initialized. Call an async method first to initialize the model.',
				)
			}
			return this._model.modelName
		}

		/**
		 * Get schema metadata
		 */
		getMetadata(): SchemaMetadata {
			if (!this._model) {
				throw new Error(
					'Model not initialized. Call an async method first to initialize the model.',
				)
			}
			// Try to get schema class from schema options if stored
			// Access options through type assertion since mongoose types don't expose it directly
			const schemaOptions = (
				this._model.schema as unknown as { options?: Record<string, unknown> }
			).options
			const schemaClass = schemaOptions?.schemaClass as
				| (new () => unknown)
				| undefined
			const options = schemaClass ? getSchemaOptions(schemaClass) : {}

			// Build properties from schema paths
			const properties: SchemaMetadata['properties'] = []
			this._model.schema.eachPath((path, schemaType) => {
				// Skip internal paths
				if (path.startsWith('_')) return

				properties.push({
					name: path,
					type: schemaType.instance || 'Mixed',
					isArray: schemaType.instance === 'Array',
					unique: schemaType.options?.unique === true,
					required: schemaType.isRequired === true,
					validations: [],
					ui: { tab: 'General', type: 'text' },
					ref: schemaType.options?.ref as string | undefined,
				})
			})

			return {
				name: this._model.modelName.toLowerCase(),
				className: this._model.modelName,
				properties,
				options,
			}
		}
	}
}
