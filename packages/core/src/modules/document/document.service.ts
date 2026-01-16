import { Model } from '@magnet/common'
import { Injectable } from '@nestjs/common'
import { InternationalizationService } from '~/modules/database/modules/internationalization/internationalization.service'
import { HistoryService } from '~/modules/history/history.service'
import type {
	CreateDocumentOptions,
	Document,
	DocumentStatus,
	FindDocumentOptions,
	ListDocumentOptions,
	PublishDocumentOptions,
	UpdateDocumentOptions,
} from './document.types'
import {
	generateDocumentId as generateId,
	isValidDocumentId as isValidId,
} from './utils/document-id.util'

@Injectable()
export class DocumentService {
	constructor(
		private readonly i18nService: InternationalizationService,
		private readonly historyService: HistoryService,
	) {}

	/**
	 * Generate a new document ID
	 */
	generateDocumentId(): string {
		return generateId()
	}

	/**
	 * Validate a document ID
	 */
	isValidDocumentId(id: string): boolean {
		return isValidId(id)
	}

	/**
	 * Get the default locale
	 */
	getDefaultLocale(): string {
		return this.i18nService.getDefaultLocale()
	}

	/**
	 * Get all configured locales
	 */
	getLocales(): string[] {
		return this.i18nService.getLocales()
	}

	/**
	 * Create a new document (creates a draft row)
	 * @param model The model to use for database operations
	 * @param data The document data
	 * @param options Create options
	 */
	async create<T>(
		model: Model<T>,
		data: Partial<T>,
		options: CreateDocumentOptions = {},
	): Promise<Document<T>> {
		const locale = options.locale ?? this.getDefaultLocale()
		const documentId = generateId()
		const now = new Date()

		const documentData = {
			...data,
			documentId,
			locale,
			status: 'draft' as DocumentStatus,
			publishedAt: null,
			createdAt: now,
			updatedAt: now,
			createdBy: options.createdBy,
		}

		// Skip validation for drafts - validation happens on publish
		const created = await model.create(
			documentData as unknown as Partial<T & { id: string }>,
			{ skipValidation: true },
		)
		return created as unknown as Document<T>
	}

	/**
	 * Find a document by its documentId
	 * @param model The model to use
	 * @param documentId The document ID
	 * @param options Find options (locale, status)
	 */
	async findByDocumentId<T>(
		model: Model<T>,
		documentId: string,
		options: FindDocumentOptions = {},
	): Promise<Document<T> | Document<T>[] | null> {
		const query: Record<string, unknown> = { documentId }

		if (options.locale) {
			query.locale = options.locale
		}

		if (options.status) {
			query.status = options.status
		}

		// If both locale and status are specified, return single document
		if (options.locale && options.status) {
			let doc = await model.findOne(
				query as unknown as Partial<T & { id: string }>,
			)

			// Fallback: try finding by id for schemas without i18n/versioning
			if (!doc) {
				doc = await model.findOne({ id: documentId } as unknown as Partial<
					T & { id: string }
				>)
			}

			return doc as unknown as Document<T> | null
		}

		// Otherwise return all matching documents
		let docs = await model.findMany(
			query as unknown as Partial<T & { id: string }>,
		)

		// Fallback: try finding by id for schemas without i18n/versioning
		if ((!docs || docs.length === 0) && !options.locale && !options.status) {
			const doc = await model.findOne({ id: documentId } as unknown as Partial<
				T & { id: string }
			>)
			if (doc) {
				docs = [doc]
			}
		}

		return docs as unknown as Document<T>[]
	}

	/**
	 * Find the draft version of a document
	 */
	async findDraft<T>(
		model: Model<T>,
		documentId: string,
		locale?: string,
	): Promise<Document<T> | null> {
		const result = await this.findByDocumentId(model, documentId, {
			locale: locale ?? this.getDefaultLocale(),
			status: 'draft',
		})
		return result as Document<T> | null
	}

	/**
	 * Find the published version of a document
	 */
	async findPublished<T>(
		model: Model<T>,
		documentId: string,
		locale?: string,
	): Promise<Document<T> | null> {
		const result = await this.findByDocumentId(model, documentId, {
			locale: locale ?? this.getDefaultLocale(),
			status: 'published',
		})
		return result as Document<T> | null
	}

	/**
	 * List all documents with optional filtering
	 * @param model The model to use
	 * @param options List options
	 */
	async list<T>(
		model: Model<T>,
		options: ListDocumentOptions = {},
	): Promise<Document<T>[]> {
		const query: Record<string, unknown> = {}

		if (options.locale) {
			query.locale = options.locale
		}

		if (options.status) {
			query.status = options.status
		}

		const docs = await model.findMany(
			query as unknown as Partial<T & { id: string }>,
		)
		return docs as unknown as Document<T>[]
	}

	/**
	 * Update a document (always targets draft, auto-creates from published if needed)
	 * @param model The model to use
	 * @param documentId The document ID
	 * @param data The data to update
	 * @param options Update options
	 */
	async update<T>(
		model: Model<T>,
		documentId: string,
		data: Partial<T>,
		options: UpdateDocumentOptions = {},
	): Promise<Document<T> | null> {
		const locale = options.locale ?? this.getDefaultLocale()
		// Always update draft, never published directly
		const status = 'draft'

		const query = { documentId, locale, status }

		// Try to find existing draft
		const existingDraft = await model.findOne(
			query as unknown as Partial<T & { id: string }>,
		)

		if (!existingDraft) {
			// No draft exists - check if published exists to copy from
			const published = await this.findPublished(model, documentId, locale)
			if (published) {
				// Create new draft from published + new data
				const {
					id: _id,
					status: _status,
					publishedAt: _publishedAt,
					...publishedData
				} = published as Document<T> & { id?: string; publishedAt?: Date }
				const now = new Date()
				const draftData = {
					...publishedData,
					...data,
					status: 'draft' as const,
					publishedAt: null,
					updatedAt: now,
					updatedBy: options.updatedBy,
				}
				// Skip validation for drafts - validation happens on publish
				const created = await model.create(
					draftData as unknown as Partial<T & { id: string }>,
					{ skipValidation: true },
				)
				return created as unknown as Document<T>
			}
			// No published either - document doesn't exist
			return null
		}

		// Draft exists - update it
		const updateData = {
			...data,
			updatedAt: new Date(),
			updatedBy: options.updatedBy,
		}

		// Skip validation for drafts - validation happens on publish
		const updated = await model.update(
			query as unknown as Partial<T & { id: string }>,
			updateData as unknown as Partial<T & { id: string }>,
			{ skipValidation: true },
		)

		return updated as unknown as Document<T>
	}

	/**
	 * Publish a document (copy draft to published)
	 * @param model The model to use
	 * @param documentId The document ID
	 * @param options Publish options
	 */
	async publish<T>(
		model: Model<T>,
		documentId: string,
		collection: string,
		options: PublishDocumentOptions = {},
	): Promise<Document<T> | null> {
		const locale = options.locale ?? this.getDefaultLocale()

		// Find the draft version
		const draft = await this.findDraft(model, documentId, locale)
		if (!draft) {
			return null
		}

		// Check if a published version already exists
		const existingPublished = await this.findPublished(
			model,
			documentId,
			locale,
		)

		const now = new Date()
		const publishedData = {
			...draft,
			status: 'published' as DocumentStatus,
			publishedAt: now,
			updatedAt: now,
			updatedBy: options.publishedBy,
		}

		// Remove the id from the data (we'll create a new row or update existing)
		const { id: _id, ...dataWithoutId } = publishedData

		let published: Document<T>

		if (existingPublished) {
			// Update existing published version
			const updated = await model.update(
				{ documentId, locale, status: 'published' } as unknown as Partial<
					T & { id: string }
				>,
				dataWithoutId as unknown as Partial<T & { id: string }>,
			)
			published = updated as unknown as Document<T>
		} else {
			// Create new published version
			const created = await model.create(
				dataWithoutId as unknown as Partial<T & { id: string }>,
			)
			published = created as unknown as Document<T>
		}

		// Create a version history entry
		await this.historyService.createVersion(
			documentId,
			collection,
			draft,
			'published',
			options.publishedBy,
			`Published ${locale} locale`,
			locale,
		)

		// Delete the draft after publishing (content is now published)
		await model.delete({
			documentId,
			locale,
			status: 'draft',
		} as unknown as Partial<T & { id: string }>)

		return published
	}

	/**
	 * Unpublish a document (remove published version)
	 * @param model The model to use
	 * @param documentId The document ID
	 * @param locale The locale to unpublish
	 */
	async unpublish<T>(
		model: Model<T>,
		documentId: string,
		locale?: string,
	): Promise<boolean> {
		const targetLocale = locale ?? this.getDefaultLocale()

		return model.delete({
			documentId,
			locale: targetLocale,
			status: 'published',
		} as unknown as Partial<T & { id: string }>)
	}

	/**
	 * Delete a document (all locales and statuses)
	 * @param model The model to use
	 * @param documentId The document ID
	 */
	async delete<T>(model: Model<T>, documentId: string): Promise<boolean> {
		// Find all documents with this documentId
		const docs = (await this.findByDocumentId(
			model,
			documentId,
		)) as Document<T>[]

		if (!Array.isArray(docs) || docs.length === 0) {
			return false
		}

		// Delete each document row
		for (const doc of docs) {
			await model.delete({ id: doc.id } as unknown as Partial<
				T & { id: string }
			>)
		}

		return true
	}

	/**
	 * Delete a specific locale (both draft and published)
	 * @param model The model to use
	 * @param documentId The document ID
	 * @param locale The locale to delete
	 */
	async deleteLocale<T>(
		model: Model<T>,
		documentId: string,
		locale: string,
	): Promise<boolean> {
		// Delete draft
		await model.delete({
			documentId,
			locale,
			status: 'draft',
		} as unknown as Partial<T & { id: string }>)

		// Delete published
		await model.delete({
			documentId,
			locale,
			status: 'published',
		} as unknown as Partial<T & { id: string }>)

		return true
	}

	/**
	 * Add a new locale to an existing document (creates a draft)
	 * @param model The model to use
	 * @param documentId The document ID
	 * @param locale The new locale
	 * @param data Initial data for the new locale
	 * @param options Create options
	 */
	async addLocale<T>(
		model: Model<T>,
		documentId: string,
		locale: string,
		data: Partial<T>,
		options: { createdBy?: string } = {},
	): Promise<Document<T>> {
		// Direct check without fallback - query exactly for this locale and status
		const existing = await model.findOne({
			documentId,
			locale,
			status: 'draft',
		} as unknown as Partial<T & { id: string }>)
		if (existing) {
			throw new Error(
				`Locale '${locale}' already exists for document '${documentId}'`,
			)
		}

		const now = new Date()
		const documentData = {
			...data,
			documentId,
			locale,
			status: 'draft' as DocumentStatus,
			publishedAt: null,
			createdAt: now,
			updatedAt: now,
			createdBy: options.createdBy,
		}

		// Skip validation for drafts - validation happens on publish
		const created = await model.create(
			documentData as unknown as Partial<T & { id: string }>,
			{ skipValidation: true },
		)
		return created as unknown as Document<T>
	}

	/**
	 * Get all locales for a document
	 * @param model The model to use
	 * @param documentId The document ID
	 */
	async getDocumentLocales<T>(
		model: Model<T>,
		documentId: string,
	): Promise<string[]> {
		const docs = (await this.findByDocumentId(
			model,
			documentId,
		)) as Document<T>[]

		if (!Array.isArray(docs)) {
			return []
		}

		// Get unique locales
		const locales = new Set<string>()
		for (const doc of docs) {
			locales.add(doc.locale)
		}

		return Array.from(locales)
	}

	/**
	 * Get the status of all locales for a document
	 * @param model The model to use
	 * @param documentId The document ID
	 */
	async getLocaleStatuses<T>(
		model: Model<T>,
		documentId: string,
	): Promise<Record<string, { hasDraft: boolean; hasPublished: boolean }>> {
		const docs = (await this.findByDocumentId(
			model,
			documentId,
		)) as Document<T>[]

		if (!Array.isArray(docs)) {
			return {}
		}

		const statuses: Record<
			string,
			{ hasDraft: boolean; hasPublished: boolean }
		> = {}

		for (const doc of docs) {
			let localeStatus = statuses[doc.locale]
			if (!localeStatus) {
				localeStatus = { hasDraft: false, hasPublished: false }
				statuses[doc.locale] = localeStatus
			}

			if (doc.status === 'draft') {
				localeStatus.hasDraft = true
			} else if (doc.status === 'published') {
				localeStatus.hasPublished = true
			}
		}

		return statuses
	}
}
