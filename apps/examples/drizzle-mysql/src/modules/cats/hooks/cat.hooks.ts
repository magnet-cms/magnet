import { BaseSchema, InjectModel, Model } from '@magnet-cms/common'
import { Hook } from '@magnet-cms/core'
import { Injectable } from '@nestjs/common'
import { Cat } from '../schemas/cat.schema'

/**
 * Hooks for Cat operations
 * These hooks are automatically discovered by the PluginService
 */
@Injectable()
export class CatHooks {
	constructor(
		@InjectModel(Cat)
		private catModel: Model<Cat>,
	) {}

	/**
	 * Hook executed before creating a cat
	 * Auto-generates tagID if not provided
	 */
	@Hook('before:cat:create')
	async beforeCreate(data: Partial<Cat>): Promise<Partial<Cat>> {
		// Auto-generate tagID if not provided
		if (!data.tagID) {
			const timestamp = Date.now().toString(36).toUpperCase()
			const random = Math.random().toString(36).substring(2, 6).toUpperCase()
			data.tagID = `CAT-${timestamp}-${random}`
		}

		// Note: Owner validation would be done here if Owner model was injected
		// This demonstrates the hook pattern for data transformation/validation

		return data
	}

	/**
	 * Hook executed after creating a cat
	 * Creates initial health record
	 */
	@Hook('after:cat:create')
	async afterCreate(cat: BaseSchema<Cat>): Promise<void> {
		console.log(`[CatHooks] Cat created: ${cat.tagID} - ${cat.name}`)
		// Note: Medical records would be created here if the module was included
	}

	/**
	 * Hook executed before updating a cat
	 * Tracks weight changes and logs health milestones
	 */
	@Hook('before:cat:update')
	async beforeUpdate(
		id: string,
		data: Partial<Cat>,
		currentCat: BaseSchema<Cat>,
	): Promise<Partial<Cat>> {
		// Track weight changes
		if (data.weight && currentCat.weight) {
			const weightChange = data.weight - currentCat.weight
			if (Math.abs(weightChange) > 0.5) {
				console.log(
					`[CatHooks] Weight change detected for ${currentCat.tagID}: ${currentCat.weight}kg -> ${data.weight}kg (${weightChange > 0 ? '+' : ''}${weightChange}kg)`,
				)

				// Log milestone: significant weight gain/loss
				if (Math.abs(weightChange) > 2) {
					console.warn(
						`[CatHooks] Significant weight change for ${currentCat.tagID} - may require veterinary attention`,
					)
				}
			}
		}

		return data
	}

	/**
	 * Hook executed before deleting a cat
	 * Prevents deletion if cat has active medical records
	 */
	@Hook('before:cat:delete')
	async beforeDelete(cat: BaseSchema<Cat>): Promise<boolean> {
		// Note: Medical records check would be done here if the module was included
		return true
	}
}
