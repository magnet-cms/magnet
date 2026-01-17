import type { AuthStrategy } from '@magnet-cms/common'
import { Model } from '@magnet-cms/common'
import { Inject, Injectable, Optional } from '@nestjs/common'
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
import { AUTH_STRATEGY } from '../auth/auth.constants'
import { DiscoveryService } from '../discovery/discovery.service'

@Injectable()
export class ContentService {
	constructor(
		private readonly moduleRef: ModuleRef,
		private readonly documentService: DocumentService,
		private readonly historyService: HistoryService,
		private readonly discoveryService: DiscoveryService,
		@Optional()
		@Inject(AUTH_STRATEGY)
		private readonly authStrategy?: AuthStrategy,
	) {}

	/**
	 * Convert schema name (kebab-case or lowercase) to PascalCase
	 * Examples: "medical-record" -> "MedicalRecord", "medicalrecord" -> "MedicalRecord"
	 */
	private toPascalCase(name: string): string {
		// Handle kebab-case (e.g., "medical-record")
		if (name.includes('-')) {
			return name
				.split('-')
				.map(
					(word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
				)
				.join('')
		}
		// Handle lowercase (e.g., "medicalrecord")
		// For lowercase without separators, we need to infer word boundaries
		// Common patterns: "medicalrecord" should be "MedicalRecord"
		// Try to detect common word boundaries
		const commonWords = ['record', 'medical', 'owner', 'cat', 'veterinarian']
		const lower = name.toLowerCase()

		for (const word of commonWords) {
			if (lower.endsWith(word) && lower.length > word.length) {
				const prefix = lower.slice(0, -word.length)
				return (
					prefix.charAt(0).toUpperCase() +
					prefix.slice(1) +
					word.charAt(0).toUpperCase() +
					word.slice(1)
				)
			}
		}

		// Fallback: capitalize first letter (existing behavior)
		return name.charAt(0).toUpperCase() + name.slice(1)
	}

	/**
	 * Get a model by schema name, trying multiple token patterns
	 */
	private getModel<T>(schemaName: string): Model<T> {
		// Normalize input: convert snake_case or any separators to kebab-case
		const normalizedName = schemaName
			.replace(/_/g, '-')
			.replace(/([a-z])([A-Z])/g, '$1-$2')
			.toLowerCase()

		// First, try to get the actual class name from discovery service
		const discoveredSchemas = this.discoveryService.getAllDiscoveredSchemas()
		const found = discoveredSchemas.find(
			(s) =>
				s.apiName?.toLowerCase() === normalizedName ||
				s.name.toLowerCase() === normalizedName ||
				s.name.toLowerCase() === schemaName.toLowerCase(),
		)

		// If found, use the original class name from metadata
		if (found?.className) {
			const token = `Magnet${found.className}Model`
			try {
				return this.moduleRef.get<Model<T>>(token, { strict: false })
			} catch {
				// Fall through to try other patterns
			}
		}

		// Fallback: Try multiple token patterns
		const patterns = [
			// Pattern 1: Direct PascalCase conversion
			this.toPascalCase(normalizedName),
			// Pattern 2: Kebab-case to PascalCase
			normalizedName.includes('-')
				? normalizedName
						.split('-')
						.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
						.join('')
				: null,
		].filter(Boolean) as string[]

		// Try each pattern
		for (const pattern of patterns) {
			const token = `Magnet${pattern}Model`
			try {
				return this.moduleRef.get<Model<T>>(token, { strict: false })
			} catch {
				// Continue to next pattern
			}
		}

		// If all patterns fail, throw error
		throw new Error(
			`Model '${schemaName}' not found. Make sure it's registered.`,
		)
	}

	/**
	 * List all documents for a schema
	 */
	async list<T>(schemaName: string, options: ListDocumentOptions = {}) {
		// Special handling for "user" schema when using Supabase Auth
		if (
			schemaName.toLowerCase() === 'user' &&
			this.authStrategy?.name === 'supabase'
		) {
			// Check if the strategy has listUsers method (SupabaseAuthStrategy)
			const supabaseStrategy = this.authStrategy as any
			if (typeof supabaseStrategy.listUsers === 'function') {
				try {
					const users = await supabaseStrategy.listUsers()
					// Transform to match Document<T>[] format (array of documents)
					return users.map((user: any) => ({
						id: user.id,
						email: user.email,
						name: user.name,
						role: user.role,
						createdAt: new Date(),
						updatedAt: new Date(),
					})) as unknown as T[]
				} catch (error) {
					// If listUsers fails, fall back to database query
					console.warn(
						'Failed to list users from Supabase Auth, falling back to database:',
						error,
					)
				}
			}
		}

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
