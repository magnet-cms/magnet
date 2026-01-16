import { Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { DocumentService } from '~/modules/document/document.service'
import type {
	CreateDocumentOptions,
	FindDocumentOptions,
	ListDocumentOptions,
	PublishDocumentOptions,
	UpdateDocumentOptions,
} from '~/modules/document/document.types'
import { HistoryService } from '~/modules/history/history.service'

@Injectable()
export class ContentService {
	constructor(
		private readonly moduleRef: ModuleRef,
		private readonly documentService: DocumentService,
		private readonly historyService: HistoryService,
	) {}

	/**
	 * Get a model by schema name
	 */
	private getModel<T>(schemaName: string): Model<T> {
		// Capitalize first letter for token lookup
		const capitalizedName =
			schemaName.charAt(0).toUpperCase() + schemaName.slice(1)
		const token = `Magnet${capitalizedName}Model`

		try {
			return this.moduleRef.get<Model<T>>(token, { strict: false })
		} catch {
			throw new Error(
				`Model '${schemaName}' not found. Make sure it's registered.`,
			)
		}
	}

	/**
	 * List all documents for a schema
	 */
	async list<T>(schemaName: string, options: ListDocumentOptions = {}) {
		const model = this.getModel<T>(schemaName)
		return this.documentService.list(model, options)
	}

	/**
	 * Find a document by documentId
	 */
	async findByDocumentId<T>(
		schemaName: string,
		documentId: string,
		options: FindDocumentOptions = {},
	) {
		const model = this.getModel<T>(schemaName)
		return this.documentService.findByDocumentId(model, documentId, options)
	}

	/**
	 * Find draft version of a document
	 */
	async findDraft<T>(schemaName: string, documentId: string, locale?: string) {
		const model = this.getModel<T>(schemaName)
		return this.documentService.findDraft(model, documentId, locale)
	}

	/**
	 * Find published version of a document
	 */
	async findPublished<T>(
		schemaName: string,
		documentId: string,
		locale?: string,
	) {
		const model = this.getModel<T>(schemaName)
		return this.documentService.findPublished(model, documentId, locale)
	}

	/**
	 * Create a new document
	 */
	async create<T>(
		schemaName: string,
		data: Partial<T>,
		options: CreateDocumentOptions = {},
	) {
		const model = this.getModel<T>(schemaName)
		return this.documentService.create(model, data, options)
	}

	/**
	 * Update a document
	 */
	async update<T>(
		schemaName: string,
		documentId: string,
		data: Partial<T>,
		options: UpdateDocumentOptions = {},
	) {
		const model = this.getModel<T>(schemaName)
		return this.documentService.update(model, documentId, data, options)
	}

	/**
	 * Publish a document
	 */
	async publish<T>(
		schemaName: string,
		documentId: string,
		options: PublishDocumentOptions = {},
	) {
		const model = this.getModel<T>(schemaName)
		return this.documentService.publish(model, documentId, schemaName, options)
	}

	/**
	 * Unpublish a document
	 */
	async unpublish<T>(schemaName: string, documentId: string, locale?: string) {
		const model = this.getModel<T>(schemaName)
		return this.documentService.unpublish(model, documentId, locale)
	}

	/**
	 * Delete a document (all locales and statuses)
	 */
	async delete<T>(schemaName: string, documentId: string) {
		const model = this.getModel<T>(schemaName)
		return this.documentService.delete(model, documentId)
	}

	/**
	 * Delete a specific locale
	 */
	async deleteLocale<T>(
		schemaName: string,
		documentId: string,
		locale: string,
	) {
		const model = this.getModel<T>(schemaName)
		return this.documentService.deleteLocale(model, documentId, locale)
	}

	/**
	 * Add a new locale to an existing document
	 */
	async addLocale<T>(
		schemaName: string,
		documentId: string,
		locale: string,
		data: Partial<T>,
		options: { createdBy?: string } = {},
	) {
		const model = this.getModel<T>(schemaName)
		return this.documentService.addLocale(
			model,
			documentId,
			locale,
			data,
			options,
		)
	}

	/**
	 * Get all locales for a document
	 */
	async getDocumentLocales<T>(schemaName: string, documentId: string) {
		const model = this.getModel<T>(schemaName)
		return this.documentService.getDocumentLocales(model, documentId)
	}

	/**
	 * Get locale statuses for a document
	 */
	async getLocaleStatuses<T>(schemaName: string, documentId: string) {
		const model = this.getModel<T>(schemaName)
		return this.documentService.getLocaleStatuses(model, documentId)
	}

	/**
	 * Get version history for a document
	 */
	async getVersions(schemaName: string, documentId: string, locale?: string) {
		if (locale) {
			return this.historyService.findVersionsByLocale(
				documentId,
				schemaName,
				locale,
			)
		}
		return this.historyService.findVersions(documentId, schemaName)
	}

	/**
	 * Restore a specific version
	 */
	async restoreVersion<T>(
		schemaName: string,
		documentId: string,
		locale: string,
		versionNumber: number,
	) {
		const model = this.getModel<T>(schemaName)

		// Get the version from history
		const version = await this.historyService.findVersionByNumber(
			documentId,
			schemaName,
			locale,
			versionNumber,
		)

		if (!version) {
			return null
		}

		// Update the draft with the version's data
		const restored = await this.documentService.update(
			model,
			documentId,
			version.data as Partial<T>,
			{ locale, status: 'draft' },
		)

		// Create a new version entry for the restore action
		await this.historyService.createVersion(
			documentId,
			schemaName,
			version.data,
			'draft',
			undefined,
			`Restored from version ${versionNumber}`,
			locale,
		)

		return restored
	}
}
