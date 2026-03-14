import type { EventName } from '@magnet-cms/common'
import {
	BadRequestException,
	Controller,
	Delete,
	Get,
	Param,
	Query,
	UseGuards,
} from '@nestjs/common'
import { RestrictedRoute } from '~/decorators/restricted.route'
import { JwtAuthGuard } from '~/modules/auth/guards/jwt-auth.guard'
import { ActivityService } from './activity.service'
import { Activity } from './schemas/activity.schema'

/** All known EventName values — used to validate the `action` query param. */
const VALID_EVENT_NAMES = new Set<string>([
	'content.created',
	'content.updated',
	'content.deleted',
	'content.published',
	'content.unpublished',
	'content.version.created',
	'content.version.restored',
	'user.created',
	'user.updated',
	'user.deleted',
	'user.registered',
	'user.login',
	'user.logout',
	'user.logout_all',
	'user.password_changed',
	'user.password_reset_requested',
	'user.password_reset',
	'user.password_reset_completed',
	'user.email_verified',
	'user.session_revoked',
	'auth.token_refreshed',
	'auth.session_created',
	'auth.session_revoked',
	'auth.failed_login_attempt',
	'role.created',
	'role.updated',
	'role.deleted',
	'role.permissions_updated',
	'role.user_assigned',
	'settings.updated',
	'settings.group_updated',
	'media.uploaded',
	'media.deleted',
	'media.folder_created',
	'media.folder_deleted',
	'api_key.created',
	'api_key.revoked',
	'api_key.used',
	'webhook.created',
	'webhook.updated',
	'webhook.deleted',
	'webhook.delivery_success',
	'webhook.delivery_failed',
	'plugin.initialized',
	'plugin.destroyed',
	'notification.created',
	'system.startup',
	'system.shutdown',
])

@Controller('activity')
@RestrictedRoute()
@UseGuards(JwtAuthGuard)
export class ActivityController {
	constructor(private readonly activityService: ActivityService) {}

	/**
	 * GET /activity — Get recent activities
	 */
	@Get()
	async getRecent(@Query('limit') limit?: string): Promise<Activity[]> {
		const parsedLimit = limit ? Number.parseInt(limit, 10) : 50
		return this.activityService.getRecent(
			Number.isNaN(parsedLimit) ? 50 : parsedLimit,
		)
	}

	/**
	 * GET /activity/entity/:entityType/:entityId — Get activities for an entity
	 */
	@Get('entity/:entityType/:entityId')
	async getByEntity(
		@Param('entityType') entityType: string,
		@Param('entityId') entityId: string,
		@Query('limit') limit?: string,
	): Promise<Activity[]> {
		const parsedLimit = limit ? Number.parseInt(limit, 10) : 100
		return this.activityService.getByEntity(
			entityType,
			entityId,
			Number.isNaN(parsedLimit) ? 100 : parsedLimit,
		)
	}

	/**
	 * GET /activity/user/:userId — Get activities by user
	 */
	@Get('user/:userId')
	async getByUser(
		@Param('userId') userId: string,
		@Query('limit') limit?: string,
	): Promise<Activity[]> {
		const parsedLimit = limit ? Number.parseInt(limit, 10) : 100
		return this.activityService.getByUser(
			userId,
			Number.isNaN(parsedLimit) ? 100 : parsedLimit,
		)
	}

	/**
	 * GET /activity/search — Search activities with filters
	 */
	@Get('search')
	async search(
		@Query('action') action?: string,
		@Query('entityType') entityType?: string,
		@Query('entityId') entityId?: string,
		@Query('userId') userId?: string,
		@Query('from') from?: string,
		@Query('to') to?: string,
		@Query('limit') limit?: string,
		@Query('offset') offset?: string,
	) {
		if (action !== undefined && !VALID_EVENT_NAMES.has(action)) {
			throw new BadRequestException(
				`Invalid action: "${action}". Must be a known event name.`,
			)
		}
		return this.activityService.search({
			action: action as EventName | undefined,
			entityType,
			entityId,
			userId,
			from: from ? new Date(from) : undefined,
			to: to ? new Date(to) : undefined,
			limit: limit ? Number.parseInt(limit, 10) : undefined,
			offset: offset ? Number.parseInt(offset, 10) : undefined,
		})
	}

	/**
	 * DELETE /activity/cleanup — Delete old activities beyond retention period
	 */
	@Delete('cleanup')
	async cleanup(
		@Query('retentionDays') retentionDays?: string,
	): Promise<{ deleted: number }> {
		const days = retentionDays ? Number.parseInt(retentionDays, 10) : 90
		const deleted = await this.activityService.cleanup(
			Number.isNaN(days) ? 90 : days,
		)
		return { deleted }
	}
}
