import {
	Body,
	Controller,
	Delete,
	Get,
	NotFoundException,
	Param,
	Post,
	Put,
	Query,
	UseGuards,
} from '@nestjs/common'
import { RestrictedRoute } from '~/decorators/restricted.route'
import { DynamicAuthGuard } from '~/modules/auth/guards/dynamic-auth.guard'
import type { VersionDiff } from './dto/version-diff.dto'
import { HistoryService } from './history.service'
import { History } from './schemas/history.schema'

@Controller('history')
@RestrictedRoute()
@UseGuards(DynamicAuthGuard)
export class HistoryController {
	constructor(private readonly historyService: HistoryService) {}

	private mapVersion(
		version: History,
	): History & { collection: string; version: number } {
		return {
			...version,
			collection: version.schemaName,
			version: version.versionNumber,
		}
	}

	@Get('versions/:documentId')
	async getVersions(
		@Param('documentId') documentId: string,
		@Query('collection') collection: string,
	): Promise<(History & { collection: string; version: number })[]> {
		const versions = await this.historyService.findVersions(
			documentId,
			collection,
		)
		return versions.map((v) => this.mapVersion(v))
	}

	@Get('versions/:documentId/latest')
	async getLatestVersion(
		@Param('documentId') documentId: string,
		@Query('collection') collection: string,
		@Query('locale') locale?: string,
		@Query('status') status: 'draft' | 'published' | 'archived' = 'published',
	): Promise<(History & { collection: string; version: number }) | null> {
		const version = await this.historyService.findLatestVersion(
			documentId,
			collection,
			status,
		)
		return version ? this.mapVersion(version) : null
	}

	@Get('version/:versionId')
	async getVersionById(
		@Param('versionId') versionId: string,
	): Promise<(History & { collection: string; version: number }) | null> {
		const version = await this.historyService.findVersionById(versionId)
		if (!version) {
			throw new NotFoundException('Version not found')
		}
		return this.mapVersion(version)
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
			data: Record<string, unknown>
			status?: 'draft' | 'published' | 'archived'
			createdBy?: string
			notes?: string
		},
	): Promise<History & { collection: string; version: number }> {
		const version = await this.historyService.createVersion(
			documentId,
			collection,
			data,
			status,
			createdBy,
			notes,
		)
		return this.mapVersion(version)
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

	@Get('compare/:versionId1/:versionId2')
	async compareVersions(
		@Param('versionId1') versionId1: string,
		@Param('versionId2') versionId2: string,
	): Promise<VersionDiff> {
		return this.historyService.compareVersions(versionId1, versionId2)
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
