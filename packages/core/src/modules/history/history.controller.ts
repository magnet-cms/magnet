import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Query,
} from '@nestjs/common'
import { HistoryService } from './history.service'
import { History } from './schemas/history.schema'

@Controller('history')
export class HistoryController {
	constructor(private readonly historyService: HistoryService) {}

	@Get('versions/:documentId')
	async getVersions(
		@Param('documentId') documentId: string,
		@Query('collection') collection: string,
	): Promise<History[]> {
		return this.historyService.findVersions(documentId, collection)
	}

	@Get('versions/:documentId/latest')
	async getLatestVersion(
		@Param('documentId') documentId: string,
		@Query('collection') collection: string,
		@Query('status') status: 'draft' | 'published' | 'archived' = 'published',
	): Promise<History | null> {
		return this.historyService.findLatestVersion(documentId, collection, status)
	}

	@Get('version/:versionId')
	async getVersionById(
		@Param('versionId') versionId: string,
	): Promise<History | null> {
		return this.historyService.findVersionById(versionId)
	}

	@Post('version')
	async createVersion(
		@Body()
		{
			documentId,
			collection,
			data,
			status,
			createdBy,
			notes,
		}: {
			documentId: string
			collection: string
			data: any
			status?: 'draft' | 'published' | 'archived'
			createdBy?: string
			notes?: string
		},
	): Promise<History> {
		return this.historyService.createVersion(
			documentId,
			collection,
			data,
			status,
			createdBy,
			notes,
		)
	}

	@Put('version/:versionId/publish')
	async publishVersion(
		@Param('versionId') versionId: string,
	): Promise<History | null> {
		return this.historyService.publishVersion(versionId)
	}

	@Put('version/:versionId/archive')
	async archiveVersion(
		@Param('versionId') versionId: string,
	): Promise<History | null> {
		return this.historyService.archiveVersion(versionId)
	}

	@Delete('version/:versionId')
	async deleteVersion(@Param('versionId') versionId: string): Promise<boolean> {
		return this.historyService.deleteVersion(versionId)
	}

	@Get('settings')
	async getVersioningSettings() {
		return {
			maxVersions: await this.historyService.getMaxVersions(),
			draftsEnabled: await this.historyService.areDraftsEnabled(),
			requireApproval: await this.historyService.isApprovalRequired(),
			autoPublish: await this.historyService.isAutoPublishEnabled(),
		}
	}
}
