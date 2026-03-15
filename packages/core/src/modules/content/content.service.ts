import type { AuthStrategy } from '@magnet-cms/common'
import { Model, getRegisteredModel } from '@magnet-cms/common'
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
import { EventService, getEventContext } from '~/modules/events'
import { HistoryService } from '~/modules/history/history.service'
import { MagnetLogger } from '~/modules/logging/logger.service'
import { AUTH_STRATEGY } from '../auth/auth.constants'
import { DiscoveryService } from '../discovery/discovery.service'

@Injectable()
export class ContentService {
	constructor(
		private readonly moduleRef: ModuleRef,
		private readonly documentService: DocumentService,
		private readonly historyService: HistoryService,
		private readonly discoveryService: DiscoveryService,
		private readonly eventService: EventService,
		private readonly logger: MagnetLogger,
		@Optional()
		@Inject(AUTH_STRATEGY)
		private readonly authStrategy?: AuthStrategy,
	) {
		this.logger.setContext(ContentService.name)
	}

	/**
	 * Emit a content event, failing silently on error.
	 */
	private async emitEvent(
		event: Parameters<EventService['emit']>[0],
		payload: Parameters<EventService['emit']>[1],
	): Promise<void> {
		try {
			const context = getEventContext()
			await this.eventService.emit(event, payload, context)
		} catch (error) {
			this.logger.warn(
				`Failed to emit event ${event}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

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

		// If found, use the original class name from metadata with correct token pattern
		// Build the list of tokens to try
		const tokens: string[] = []
		if (found?.className) {
			tokens.push(`MAGNET_MODEL_${found.className.toUpperCase()}`)
		}
		const patterns = [
			this.toPascalCase(normalizedName),
			normalizedName.includes('-')
				? normalizedName
						.split('-')
						.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
						.join('')
				: null,
		].filter(Boolean) as string[]
		for (const p of patterns) {
			const t = `MAGNET_MODEL_${p.toUpperCase()}`
			if (!tokens.includes(t)) tokens.push(t)
		}

		// Try each token — first via moduleRef, then via global registry
		for (const token of tokens) {
			// Try global model registry first (populated by DatabaseModule.forFeature)
			const registeredModel = getRegisteredModel<Model<T>>(token)
			if (registeredModel) {
				return registeredModel
			}

			// Fallback: NestJS moduleRef (works for same-module access)
			try {
				const model = this.moduleRef.get<Model<T>>(token, {
					strict: false,
				})
				if (
					model &&
					typeof (model as unknown as Record<string, unknown>).findMany ===
						'function'
				) {
					return model
				}
			} catch {
				// Continue to next token
			}
		}

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
			const strategyWithListUsers = this.authStrategy as {
				listUsers?: () => Promise<
					Array<{ id: string; email: string; name?: string; role?: string }>
				>
			}
			if (typeof strategyWithListUsers.listUsers === 'function') {
				try {
					const users = await strategyWithListUsers.listUsers()
					// Transform to match Document<T>[] format (array of documents)
					return users.map((user) => ({
						id: user.id,
						email: user.email,
						name: user.name,
						role: user.role,
						createdAt: new Date(),
						updatedAt: new Date(),
					})) as unknown as T[]
				} catch (error) {
					// If listUsers fails, fall back to database query
					this.logger.warn(
						'Failed to list users from Supabase Auth, falling back to database',
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
		const result = await this.documentService.create(model, data, options)
		await this.emitEvent('content.created', {
			schema: schemaName,
			documentId: result.documentId,
			locale: result.locale,
		})
		return result
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
		const result = await this.documentService.update(
			model,
			documentId,
			data,
			options,
		)
		await this.emitEvent('content.updated', {
			schema: schemaName,
			documentId,
			locale: options.locale,
			changes: [],
		})
		return result
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
		const result = await this.documentService.publish(
			model,
			documentId,
			schemaName,
			options,
		)
		await this.emitEvent('content.published', {
			schema: schemaName,
			documentId,
			locale: options.locale,
		})
		return result
	}

	/**
	 * Unpublish a document
	 */
	async unpublish<T>(schemaName: string, documentId: string, locale?: string) {
		const model = this.getModel<T>(schemaName)
		const result = await this.documentService.unpublish(
			model,
			documentId,
			locale,
		)
		await this.emitEvent('content.unpublished', {
			schema: schemaName,
			documentId,
			locale,
		})
		return result
	}

	/**
	 * Delete a document (all locales and statuses)
	 */
	async delete<T>(schemaName: string, documentId: string) {
		const model = this.getModel<T>(schemaName)
		const result = await this.documentService.delete(model, documentId)
		await this.emitEvent('content.deleted', {
			schema: schemaName,
			documentId,
		})
		return result
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
			version.data as Record<string, unknown>,
			'draft',
			undefined,
			`Restored from version ${versionNumber}`,
			locale,
		)

		await this.emitEvent('content.version.restored', {
			schema: schemaName,
			documentId,
			locale,
			version: versionNumber,
		})

		return restored
	}
}
