import { InjectModel, Model } from '@magnet/common'
import { Injectable } from '@nestjs/common'
import { SettingsService } from '~/modules/settings/settings.service'
import { History } from './schemas/history.schema'
import { Versioning } from './setting/history.setting'

@Injectable()
export class HistoryService {
	constructor(
		@InjectModel(History)
		private historyModel: Model<History>,
		private settingsService: SettingsService,
	) {}

	/**
	 * Create a new version of a document for a specific locale
	 * @param documentId Document ID
	 * @param collection Collection name
	 * @param data Document data
	 * @param locale The locale for this version
	 * @param status Version status
	 * @param createdBy User ID who created the version
	 * @param notes Optional notes about the version
	 */
	async createVersion(
		documentId: string,
		collection: string,
		data: any,
		status: 'draft' | 'published' | 'archived' = 'draft',
		createdBy?: string,
		notes?: string,
		locale = 'en',
	): Promise<History> {
		// Get the next version number for this document+locale
		const versionNumber = await this.getNextVersionNumber(
			documentId,
			collection,
			locale,
		)

		// Generate a unique version ID
		const versionId = `${documentId}_${locale}_${Date.now()}`

		// Create the version
		const version = await this.historyModel.create({
			documentId,
			versionId,
			schemaName: collection,
			locale,
			versionNumber,
			status,
			data,
			createdAt: new Date(),
			createdBy,
			notes,
		})

		// Cleanup old versions if needed (per locale)
		await this.cleanupOldVersions(documentId, collection, locale)

		return version
	}

	/**
	 * Get the next version number for a document+locale
	 */
	private async getNextVersionNumber(
		documentId: string,
		collection: string,
		locale: string,
	): Promise<number> {
		const versions = await this.findVersionsByLocale(
			documentId,
			collection,
			locale,
		)

		if (versions.length === 0) {
			return 1
		}

		// Find the highest version number
		const maxVersion = Math.max(...versions.map((v) => v.versionNumber || 1))
		return maxVersion + 1
	}

	/**
	 * Find all versions of a document (all locales)
	 * @param documentId The document ID
	 * @param collection The collection name
	 */
	async findVersions(
		documentId: string,
		collection: string,
	): Promise<History[]> {
		return this.historyModel.findMany({
			documentId,
			schemaName: collection,
		} as Partial<History>)
	}

	/**
	 * Find all versions of a document for a specific locale
	 * @param documentId The document ID
	 * @param collection The collection name
	 * @param locale The locale to filter by
	 */
	async findVersionsByLocale(
		documentId: string,
		collection: string,
		locale: string,
	): Promise<History[]> {
		return this.historyModel.findMany({
			documentId,
			schemaName: collection,
			locale,
		} as Partial<History>)
	}

	/**
	 * Find a specific version by ID
	 * @param versionId The version ID
	 */
	async findVersionById(versionId: string): Promise<History | null> {
		return this.historyModel.findOne({
			versionId,
		} as Partial<History>)
	}

	/**
	 * Find a specific version by document ID, locale, and version number
	 * @param documentId The document ID
	 * @param collection The collection name
	 * @param locale The locale
	 * @param versionNumber The version number
	 */
	async findVersionByNumber(
		documentId: string,
		collection: string,
		locale: string,
		versionNumber: number,
	): Promise<History | null> {
		return this.historyModel.findOne({
			documentId,
			schemaName: collection,
			locale,
			versionNumber,
		} as Partial<History>)
	}

	/**
	 * Find the latest version of a document for a specific locale
	 * @param documentId The document ID
	 * @param collection The collection name
	 * @param locale The locale
	 * @param status Optional status filter
	 */
	async findLatestVersion(
		documentId: string,
		collection: string,
		locale: string,
		status?: 'draft' | 'published' | 'archived',
	): Promise<History | null> {
		const query: Partial<History> = {
			documentId,
			schemaName: collection,
			locale,
		}

		if (status) {
			query.status = status
		}

		const versions = await this.historyModel.findMany(query as Partial<History>)

		if (!versions.length) return null

		// Sort by versionNumber in descending order and return the first one
		const sortedVersions = versions.sort(
			(a, b) => (b.versionNumber || 0) - (a.versionNumber || 0),
		)
		return sortedVersions[0] || null
	}

	/**
	 * Update a version's status
	 * @param versionId The version ID
	 * @param status The new status
	 */
	async updateVersionStatus(
		versionId: string,
		status: 'draft' | 'published' | 'archived',
	): Promise<History | null> {
		try {
			const updated = await this.historyModel.update(
				{ versionId } as Partial<History>,
				{ status } as Partial<History>,
			)
			// Handle the case where update might return undefined
			if (!updated) return null
			return updated as unknown as History
		} catch (error) {
			console.error(`Failed to update version status: ${error}`)
			return null
		}
	}

	/**
	 * Delete a specific version
	 * @param versionId The version ID
	 */
	async deleteVersion(versionId: string): Promise<boolean> {
		return this.historyModel.delete({ versionId } as Partial<History>)
	}

	/**
	 * Publish a draft version
	 * @param versionId The version ID to publish
	 */
	async publishVersion(versionId: string): Promise<History | null> {
		const version = await this.findVersionById(versionId)
		if (!version || version.status !== 'draft') return null

		// Update the version status to published
		return this.updateVersionStatus(versionId, 'published')
	}

	/**
	 * Archive a published version
	 * @param versionId The version ID to archive
	 */
	async archiveVersion(versionId: string): Promise<History | null> {
		const version = await this.findVersionById(versionId)
		if (!version || version.status === 'archived') return null

		// Update the version status to archived
		return this.updateVersionStatus(versionId, 'archived')
	}

	/**
	 * Get all locales that have versions for a document
	 * @param documentId The document ID
	 * @param collection The collection name
	 */
	async getVersionedLocales(
		documentId: string,
		collection: string,
	): Promise<string[]> {
		const versions = await this.findVersions(documentId, collection)
		const locales = new Set<string>()

		for (const version of versions) {
			if (version.locale) {
				locales.add(version.locale)
			}
		}

		return Array.from(locales)
	}

	/**
	 * Get versioning settings
	 */
	async getVersioningSettings(): Promise<Versioning> {
		const settings = await this.settingsService.getSettingsByGroup(
			Versioning.name,
		)
		return settings.reduce(
			(acc, setting) => {
				return {
					...acc,
					[setting.key]: setting.value,
				}
			},
			{} as unknown as Versioning,
		)
	}

	/**
	 * Check if drafts are enabled
	 */
	async areDraftsEnabled(): Promise<boolean> {
		const settings = await this.getVersioningSettings()
		return settings.draftsEnabled === 'true'
	}

	/**
	 * Check if approval is required for publishing
	 */
	async isApprovalRequired(): Promise<boolean> {
		const settings = await this.getVersioningSettings()
		return settings.requireApproval === 'true'
	}

	/**
	 * Check if auto-publishing is enabled
	 */
	async isAutoPublishEnabled(): Promise<boolean> {
		const settings = await this.getVersioningSettings()
		return settings.autoPublish === 'true'
	}

	/**
	 * Get the maximum number of versions to keep
	 */
	async getMaxVersions(): Promise<number> {
		const settings = await this.getVersioningSettings()
		return settings.maxVersions
	}

	/**
	 * Clean up old versions to maintain the maximum number of versions per locale
	 * @param documentId The document ID
	 * @param collection The collection name
	 * @param locale The locale to clean up
	 */
	private async cleanupOldVersions(
		documentId: string,
		collection: string,
		locale: string,
	): Promise<void> {
		const maxVersions = await this.getMaxVersions()

		// Get all versions for this document+locale
		const versions = await this.findVersionsByLocale(
			documentId,
			collection,
			locale,
		)

		// If we have more versions than the maximum, delete the oldest ones
		if (versions.length > maxVersions) {
			// Sort by versionNumber in ascending order (oldest first)
			const sortedVersions = versions.sort(
				(a, b) => (a.versionNumber || 0) - (b.versionNumber || 0),
			)

			// Get the versions to delete (oldest ones)
			const versionsToDelete = sortedVersions.slice(
				0,
				versions.length - maxVersions,
			)

			// Delete each version
			for (const version of versionsToDelete) {
				await this.deleteVersion(version.versionId)
			}
		}
	}
}
