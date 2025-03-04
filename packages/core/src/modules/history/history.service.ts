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
	 * Create a new version of a document
	 * @param documentId Document ID
	 * @param collection Collection name
	 * @param data Document data
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
	): Promise<History> {
		// Generate a unique version ID
		const versionId = `${documentId}_${Date.now()}`

		// Create the version
		const version = await this.historyModel.create({
			documentId,
			versionId,
			collection,
			status,
			data,
			createdAt: new Date(),
			createdBy,
			notes,
		})

		// Cleanup old versions if needed
		await this.cleanupOldVersions(documentId, collection)

		return version
	}

	/**
	 * Find all versions of a document
	 * @param documentId The document ID
	 * @param collection The collection name
	 */
	async findVersions(
		documentId: string,
		collection: string,
	): Promise<History[]> {
		return this.historyModel.findMany({
			documentId,
			collection,
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
	 * Find the latest version of a document with a specific status
	 * @param documentId The document ID
	 * @param collection The collection name
	 * @param status The version status
	 */
	async findLatestVersion(
		documentId: string,
		collection: string,
		status: 'draft' | 'published' | 'archived',
	): Promise<History | null> {
		const versions = await this.historyModel.findMany({
			documentId,
			collection,
			status,
		} as Partial<History>)

		if (!versions.length) return null

		// Sort by createdAt in descending order and return the first one
		const sortedVersions = versions.sort(
			(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
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
	 * Clean up old versions to maintain the maximum number of versions
	 * @param documentId The document ID
	 * @param collection The collection name
	 */
	private async cleanupOldVersions(
		documentId: string,
		collection: string,
	): Promise<void> {
		const maxVersions = await this.getMaxVersions()

		// Get all versions for this document
		const versions = await this.findVersions(documentId, collection)

		// If we have more versions than the maximum, delete the oldest ones
		if (versions.length > maxVersions) {
			// Sort by createdAt in ascending order (oldest first)
			const sortedVersions = versions.sort(
				(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
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
