import type { NotificationQueryOptions, NotifyDto } from '@magnet-cms/common'
import type { PaginatedNotifications } from '@magnet-cms/common'
import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'
import { RestrictedRoute } from '~/decorators/restricted.route'
import { DynamicAuthGuard } from '~/modules/auth/guards/dynamic-auth.guard'
import { NotificationService } from './notification.service'
import type { Notification } from './schemas/notification.schema'

interface AuthenticatedRequest extends Request {
	user: { id: string; role: string }
}

/**
 * Send-notification request body for the admin endpoint.
 */
interface SendNotificationBody {
	userId: string | string[]
	channels?: Array<'platform' | 'email'>
	type: string
	title: string
	message: string
	href?: string
	metadata?: Record<string, unknown>
}

@Controller('notifications')
@RestrictedRoute()
@UseGuards(DynamicAuthGuard)
export class NotificationController {
	constructor(private readonly notificationService: NotificationService) {}

	/**
	 * GET /notifications
	 *
	 * Returns paginated notifications for the currently authenticated user.
	 */
	@Get()
	async list(
		@Req() req: AuthenticatedRequest,
		@Query('limit') limit?: string,
		@Query('offset') offset?: string,
		@Query('unreadOnly') unreadOnly?: string,
	): Promise<PaginatedNotifications<Notification>> {
		const options: NotificationQueryOptions = {
			limit: limit ? Number.parseInt(limit, 10) : 20,
			offset: offset ? Number.parseInt(offset, 10) : 0,
			unreadOnly: unreadOnly === 'true',
		}
		return this.notificationService.getForUser(req.user.id, options)
	}

	/**
	 * GET /notifications/unread-count
	 *
	 * Returns the number of unread notifications for the current user.
	 */
	@Get('unread-count')
	async unreadCount(
		@Req() req: AuthenticatedRequest,
	): Promise<{ count: number }> {
		const count = await this.notificationService.getUnreadCount(req.user.id)
		return { count }
	}

	/**
	 * PATCH /notifications/:id/read
	 *
	 * Marks a single notification as read.
	 * Returns 404 if the notification does not belong to the current user.
	 */
	@Patch(':id/read')
	@HttpCode(HttpStatus.NO_CONTENT)
	async markAsRead(
		@Req() req: AuthenticatedRequest,
		@Param('id') id: string,
	): Promise<void> {
		if (!id) {
			throw new BadRequestException('Notification id is required')
		}
		await this.notificationService.markAsRead(id, req.user.id)
	}

	/**
	 * PATCH /notifications/read-all
	 *
	 * Marks all notifications for the current user as read.
	 */
	@Patch('read-all')
	@HttpCode(HttpStatus.NO_CONTENT)
	async markAllAsRead(@Req() req: AuthenticatedRequest): Promise<void> {
		await this.notificationService.markAllAsRead(req.user.id)
	}

	/**
	 * POST /notifications
	 *
	 * Send a notification to one or more users.
	 * Restricted to admin users only.
	 */
	@Post()
	@HttpCode(HttpStatus.ACCEPTED)
	async send(@Body() body: SendNotificationBody): Promise<{ sent: boolean }> {
		const dto: NotifyDto = {
			userId: body.userId,
			channels: body.channels ?? ['platform'],
			type: body.type,
			title: body.title,
			message: body.message,
			href: body.href,
			metadata: body.metadata,
		}
		await this.notificationService.notify(dto)
		return { sent: true }
	}

	/**
	 * DELETE /notifications/cleanup
	 *
	 * Delete notifications older than the configured retention period.
	 * Accepts an optional `retentionDays` query param to override settings.
	 */
	@Delete('cleanup')
	async cleanup(
		@Query('retentionDays') retentionDays?: string,
	): Promise<{ deleted: number }> {
		const days = retentionDays ? Number.parseInt(retentionDays, 10) : undefined
		const deleted = await this.notificationService.cleanup(
			days !== undefined && !Number.isNaN(days) ? days : undefined,
		)
		return { deleted }
	}
}
