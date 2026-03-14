import type { BaseSchema, FilterQuery, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import {
	IsArray,
	IsIn,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	Min,
} from 'class-validator'
import type { ViewConfigColumn } from './schemas/view-config.schema'
import { ViewConfig } from './schemas/view-config.schema'

export class UpsertViewConfigDto {
	@IsOptional()
	@IsArray()
	columns?: ViewConfigColumn[]

	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(100)
	pageSize?: number

	@IsOptional()
	@IsString()
	sortField?: string

	@IsOptional()
	@IsIn(['asc', 'desc'])
	sortDirection?: 'asc' | 'desc'
}

@Injectable()
export class ViewConfigService {
	constructor(
		@InjectModel(ViewConfig)
		private readonly viewConfigModel: Model<ViewConfig>,
	) {}

	/**
	 * Get the view config for a user + schema.
	 * Returns null if no config has been saved yet.
	 */
	async get(
		userId: string,
		schemaName: string,
	): Promise<BaseSchema<ViewConfig> | null> {
		return this.viewConfigModel.findOne({
			userId,
			schemaName,
		} satisfies FilterQuery<ViewConfig>)
	}

	/**
	 * Upsert a view config for a user + schema.
	 * Always sets `updatedAt` to the current server time.
	 */
	async upsert(
		userId: string,
		schemaName: string,
		dto: UpsertViewConfigDto,
	): Promise<BaseSchema<ViewConfig>> {
		const existing = await this.get(userId, schemaName)
		const now = new Date()

		if (existing) {
			return this.viewConfigModel.update(
				{ id: existing.id } as Partial<BaseSchema<ViewConfig>>,
				{
					...(dto.columns !== undefined && { columns: dto.columns }),
					...(dto.pageSize !== undefined && { pageSize: dto.pageSize }),
					...(dto.sortField !== undefined && { sortField: dto.sortField }),
					...(dto.sortDirection !== undefined && {
						sortDirection: dto.sortDirection,
					}),
					updatedAt: now,
				},
			)
		}

		return this.viewConfigModel.create({
			userId,
			schemaName,
			columns: dto.columns ?? [],
			pageSize: dto.pageSize ?? 10,
			sortField: dto.sortField,
			sortDirection: dto.sortDirection,
			updatedAt: now,
		})
	}
}
