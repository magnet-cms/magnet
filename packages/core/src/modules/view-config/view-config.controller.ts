import type { BaseSchema } from '@magnet-cms/common'
import {
	Body,
	Controller,
	Get,
	Param,
	Put,
	Req,
	UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'
import { DynamicAuthGuard } from '~/modules/auth/guards/dynamic-auth.guard'
import type { ViewConfig } from './schemas/view-config.schema'
import type { UpsertViewConfigDto } from './view-config.service'
import { ViewConfigService } from './view-config.service'

interface AuthenticatedRequest extends Request {
	user: { id: string }
}

export interface ViewConfigResponse {
	columns: Array<{ name: string; visible: boolean; order: number }>
	pageSize: number
	sortField?: string
	sortDirection?: 'asc' | 'desc'
	updatedAt: Date | string
}

@Controller('user-preferences')
@UseGuards(DynamicAuthGuard)
export class ViewConfigController {
	constructor(private readonly viewConfigService: ViewConfigService) {}

	/**
	 * GET /user-preferences/view-config/:schema
	 *
	 * Returns the saved view config for the current user + schema.
	 * If no config exists yet, returns a default (empty columns, pageSize 10).
	 */
	@Get('view-config/:schema')
	async getViewConfig(
		@Req() req: AuthenticatedRequest,
		@Param('schema') schema: string,
	): Promise<ViewConfigResponse> {
		const existing = await this.viewConfigService.get(req.user.id, schema)
		if (existing) return existing as ViewConfigResponse

		return {
			columns: [],
			pageSize: 10,
			sortField: undefined,
			sortDirection: undefined,
			updatedAt: new Date(0).toISOString(),
		}
	}

	/**
	 * PUT /user-preferences/view-config/:schema
	 *
	 * Upserts the view config for the current user + schema.
	 * Sets `updatedAt` server-side.
	 */
	@Put('view-config/:schema')
	async putViewConfig(
		@Req() req: AuthenticatedRequest,
		@Param('schema') schema: string,
		@Body() dto: UpsertViewConfigDto,
	): Promise<BaseSchema<ViewConfig>> {
		return this.viewConfigService.upsert(req.user.id, schema, dto)
	}
}
