import { BaseSchema, Model, ValidationException } from '@magnet/common'
import { Document, Model as MongooseModel } from 'mongoose'
import { isMongoServerError, mapDocumentId, mapQueryId } from '~/utils'

export function createModel<T>(
	modelInstance: MongooseModel<Document & BaseSchema<T>>,
) {
	return class MongooseModelAdapter extends Model<T> {
		model: MongooseModel<Document & BaseSchema<T>>
		currentLocale?: string
		currentVersion?: string
		versionModel?: MongooseModel<Document>

		constructor() {
			super()
			this.model = modelInstance
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
		getLocale(): string | undefined {
			return this.currentLocale
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
				// Try to get the Version model from mongoose
				this.versionModel = this.model.db.model<Document>('History')
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
		async findVersions(documentId: string): Promise<any[]> {
			const versionModel = await this.getVersionModel()
			if (!versionModel) return []

			return versionModel
				.find({
					documentId,
					schemaName: this.model.modelName,
				})
				.lean()
		}

		/**
		 * Find a specific version by ID
		 * @param versionId The version ID
		 */
		async findVersionById(versionId: string): Promise<any | null> {
			const versionModel = await this.getVersionModel()
			if (!versionModel) return null

			return versionModel.findOne({ versionId }).lean()
		}

		/**
		 * Restore a version
		 * @param versionId The version ID to restore
		 */
		async restoreVersion(versionId: string): Promise<BaseSchema<T> | null> {
			const versionModel = await this.getVersionModel()
			if (!versionModel) return null

			// Find the version
			const version = await versionModel.findOne({ versionId }).lean()
			if (!version) return null
			// Update the document with the version data
			return this.update(
				{ id: (version as any).documentId } as Partial<BaseSchema<T>>,
				(version as any).data,
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
			data: any,
			status: 'draft' | 'published' | 'archived' = 'draft',
		): Promise<any | null> {
			const versionModel = await this.getVersionModel()
			if (!versionModel) return null

			// Generate a unique version ID
			const versionId = `${documentId}_${Date.now()}`

			// Create the version
			return versionModel.create({
				documentId,
				versionId,
				schemaName: this.model.modelName,
				status,
				data,
				createdAt: new Date(),
			})
		}

		async create(data: Partial<BaseSchema<T>>): Promise<BaseSchema<T>> {
			try {
				const createdDoc = await this.model.create(data)
				const mappedDoc = mapDocumentId<T>(createdDoc.toObject())

				// If versioning is enabled, create a version
				if (this.isVersioningEnabled()) {
					await this.createVersion(mappedDoc.id, mappedDoc, 'published')
				}

				return this.applyLocale(mappedDoc) as BaseSchema<T>
			} catch (error: any) {
				// Handle MongoDB duplicate key errors
				if (isMongoServerError(error)) {
					const property = Object.keys(error.keyPattern)[0] ?? 'unknown'

					throw new ValidationException([
						{
							property,
							constraints: {
								[property]: `${property} already exists`,
							},
						},
					])
				}

				// Handle Mongoose validation errors
				if (error.name === 'ValidationError' && error.errors) {
					const validationErrors = Object.entries(error.errors).map(([property, err]: [string, any]) => ({
						property,
						constraints: {
							[err.kind || 'validation']: err.message,
						},
					}))
					throw new ValidationException(validationErrors)
				}

				throw error
			}
		}

		async find(): Promise<BaseSchema<T>[]> {
			// If a specific version is requested
			if (this.currentVersion) {
				// If it's a status (draft, published, archived)
				if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
					const versionModel = await this.getVersionModel()
					if (!versionModel) return []

					// Find all documents with the requested status
					const versions = await versionModel
						.find({
							schemaName: this.model.modelName,
							status: this.currentVersion,
						})
						.lean()

					// Group by documentId and get the latest version for each
					const latestVersions = versions.reduce(
						(acc: Record<string, any>, version: any) => {
							if (
								!acc[version.documentId] ||
								new Date(version.createdAt) >
									new Date(acc[version.documentId].createdAt)
							) {
								acc[version.documentId] = version
							}
							return acc
						},
						{},
					)

					// Return the data from each latest version
					return Object.values(latestVersions).map((version: any) =>
						this.applyLocale(version.data),
					) as BaseSchema<T>[]
				}

				// If it's a specific version ID
				const version = await this.findVersionById(this.currentVersion)
				if (version) {
					return [this.applyLocale(version.data)] as BaseSchema<T>[]
				}

				return []
			}

			// Normal find operation
			const results = await this.model.find().lean()
			const mappedResults = results.map((result) => mapDocumentId<T>(result))
			return this.applyLocale(mappedResults) as BaseSchema<T>[]
		}

		async findById(id: string): Promise<BaseSchema<T> | null> {
			// If a specific version is requested
			if (this.currentVersion) {
				// If it's a status (draft, published, archived)
				if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
					const versionModel = await this.getVersionModel()
					if (!versionModel) return null

					// Find the latest version with the requested status
					const versions = await versionModel
						.find({
							documentId: id,
							schemaName: this.model.modelName,
							status: this.currentVersion,
						})
						.sort({ createdAt: -1 })
						.limit(1)
						.lean()

					if (versions.length > 0) {
						return this.applyLocale((versions[0] as any).data) as BaseSchema<T>
					}

					return null
				}

				// If it's a specific version ID
				const version = await this.findVersionById(this.currentVersion)
				if (version && version.documentId === id) {
					return this.applyLocale(version.data) as BaseSchema<T>
				}

				return null
			}

			// Normal findById operation
			const result = await this.model.findById(id).lean()
			if (!result) return null
			const mappedResult = mapDocumentId(result)
			return this.applyLocale(mappedResult) as BaseSchema<T>
		}

		async findOne(
			query: Partial<BaseSchema<T>>,
		): Promise<BaseSchema<T> | null> {
			// If a specific version is requested
			if (this.currentVersion) {
				// If it's a status (draft, published, archived)
				if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
					const versionModel = await this.getVersionModel()
					if (!versionModel) return null

					// First find the document ID that matches the query
					const doc = await this.model.findOne(mapQueryId(query)).lean()
					if (!doc) return null

					const docId = doc._id?.toString()
					if (!docId) return null

					// Find the latest version with the requested status
					const versions = await versionModel
						.find({
							documentId: docId,
							schemaName: this.model.modelName,
							status: this.currentVersion,
						})
						.sort({ createdAt: -1 })
						.limit(1)
						.lean()

					if (versions.length > 0) {
						return this.applyLocale((versions[0] as any).data) as BaseSchema<T>
					}

					return null
				}

				// If it's a specific version ID
				const version = await this.findVersionById(this.currentVersion)
				if (version) {
					// Check if the version data matches the query
					const versionData = (version as any).data
					let matches = true

					for (const key in query) {
						if (key === 'id' && query[key] !== (version as any).documentId) {
							matches = false
							break
						}

						if (key !== 'id' && versionData[key] !== (query as any)[key]) {
							matches = false
							break
						}
					}

					if (matches) {
						return this.applyLocale(versionData) as BaseSchema<T>
					}
				}

				return null
			}

			// Normal findOne operation
			const result = await this.model.findOne(mapQueryId(query)).lean()
			if (!result) return null
			const mappedResult = mapDocumentId(result)
			return this.applyLocale(mappedResult) as BaseSchema<T>
		}

		async findMany(query: Partial<BaseSchema<T>>): Promise<BaseSchema<T>[]> {
			// If a specific version is requested
			if (this.currentVersion) {
				// If it's a status (draft, published, archived)
				if (['draft', 'published', 'archived'].includes(this.currentVersion)) {
					const versionModel = await this.getVersionModel()
					if (!versionModel) return []

					// First find all document IDs that match the query
					const docs = await this.model.find(mapQueryId(query)).lean()
					if (docs.length === 0) return []

					const docIds = docs.map((doc) => doc._id?.toString()).filter(Boolean)

					// Find all versions with the requested status for these documents
					const versions = await versionModel
						.find({
							documentId: { $in: docIds },
							schemaName: this.model.modelName,
							status: this.currentVersion,
						})
						.lean()

					// Group by documentId and get the latest version for each
					const latestVersions = versions.reduce(
						(acc: Record<string, any>, version: any) => {
							if (
								!acc[version.documentId] ||
								new Date(version.createdAt) >
									new Date(acc[version.documentId].createdAt)
							) {
								acc[version.documentId] = version
							}
							return acc
						},
						{},
					)

					// Return the data from each latest version
					return Object.values(latestVersions).map((version: any) =>
						this.applyLocale(version.data),
					) as BaseSchema<T>[]
				}

				// If it's a specific version ID
				const version = await this.findVersionById(this.currentVersion)
				if (version) {
					// Check if the version data matches the query
					const versionData = (version as any).data
					let matches = true

					for (const key in query) {
						if (key === 'id' && query[key] !== (version as any).documentId) {
							matches = false
							break
						}

						if (key !== 'id' && versionData[key] !== (query as any)[key]) {
							matches = false
							break
						}
					}

					if (matches) {
						return [this.applyLocale(versionData)] as BaseSchema<T>[]
					}
				}

				return []
			}

			// Normal findMany operation
			const results = await this.model.find(mapQueryId(query)).lean()
			const mappedResults = results.map((result) => mapDocumentId<T>(result))
			return this.applyLocale(mappedResults) as BaseSchema<T>[]
		}

		async update(
			query: Partial<BaseSchema<T>>,
			data: Partial<BaseSchema<T>>,
		): Promise<BaseSchema<T>> {
			const mongooseQuery = mapQueryId(query)
			const mongooseData = mapQueryId(data)

			// If versioning is enabled and we're in draft mode
			if (this.isVersioningEnabled() && this.currentVersion === 'draft') {
				// Find the document first
				const doc = await this.model.findOne(mongooseQuery).lean()
				if (!doc) throw new Error('Document not found')

				const docId = doc._id?.toString()
				if (!docId) throw new Error('Document ID not found')

				// Create a draft version with the updated data
				const updatedData = { ...mapDocumentId(doc), ...data }
				await this.createVersion(docId, updatedData, 'draft')

				// Return the updated data without actually updating the document
				return updatedData as BaseSchema<T>
			}

			// Normal update operation
			const result = await this.model
				.findOneAndUpdate(mongooseQuery, mongooseData, { new: true })
				.lean()

			if (!result) throw new Error('Document not found')

			const mappedResult = mapDocumentId(result)

			// If versioning is enabled, create a version
			if (this.isVersioningEnabled()) {
				await this.createVersion(mappedResult.id, mappedResult, 'published')
			}

			return this.applyLocale(mappedResult) as BaseSchema<T>
		}

		async delete(query: Partial<BaseSchema<T>>): Promise<boolean> {
			// If versioning is enabled and we're in draft mode
			if (this.isVersioningEnabled() && this.currentVersion === 'draft') {
				// Find the document first
				const doc = await this.model.findOne(mapQueryId(query)).lean()
				if (!doc) return false

				const docId = doc._id?.toString()
				if (!docId) return false

				// Create an archived version
				await this.createVersion(docId, mapDocumentId(doc), 'archived')

				return true
			}

			// Normal delete operation
			const result = await this.model.findOneAndDelete(mapQueryId(query))

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
	}
}
