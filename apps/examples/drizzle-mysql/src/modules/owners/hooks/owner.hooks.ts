import { BaseSchema, InjectModel, Model } from '@magnet-cms/common'
import { Hook } from '@magnet-cms/core'
import { Injectable } from '@nestjs/common'
import { Cat } from '../../cats/schemas/cat.schema'
import { Owner } from '../schemas/owner.schema'

/**
 * Hooks for Owner operations
 * These hooks are automatically discovered by the PluginService
 */
@Injectable()
export class OwnerHooks {
	constructor(
		@InjectModel(Owner)
		private ownerModel: Model<Owner>,
		@InjectModel(Cat)
		private catModel: Model<Cat>,
	) {}

	/**
	 * Hook executed before creating an owner
	 * Validates email uniqueness
	 */
	@Hook('before:owner:create')
	async beforeCreate(data: Partial<Owner>): Promise<Partial<Owner>> {
		// Validate email uniqueness
		if (data.email) {
			const existingOwner = await this.ownerModel.findOne({ email: data.email })
			if (existingOwner) {
				throw new Error(`Owner with email ${data.email} already exists`)
			}
		}

		return data
	}

	/**
	 * Hook executed before updating an owner
	 * Validates email uniqueness if email is being changed
	 */
	@Hook('before:owner:update')
	async beforeUpdate(
		id: string,
		data: Partial<Owner>,
		currentOwner: BaseSchema<Owner>,
	): Promise<Partial<Owner>> {
		// Validate email uniqueness if email is being changed
		if (data.email && data.email !== currentOwner.email) {
			const existingOwner = await this.ownerModel.findOne({ email: data.email })
			if (existingOwner && existingOwner.id !== id) {
				throw new Error(`Owner with email ${data.email} already exists`)
			}
		}

		return data
	}

	/**
	 * Hook executed after deleting an owner
	 * Cascade: Prevent deletion if owner has cats, or reassign cats to default owner
	 */
	@Hook('after:owner:delete')
	async afterDelete(owner: BaseSchema<Owner>): Promise<void> {
		// Check if owner has cats
		const cats = await this.catModel.query().where({ owner: owner.id }).exec()

		if (cats.length > 0) {
			console.warn(
				`[OwnerHooks] Owner ${owner.email} has ${cats.length} cat(s). Cats should be reassigned before deletion.`,
			)
			// In a real implementation, you might:
			// 1. Reassign to a default "Unassigned" owner
			// 2. Or prevent deletion (throw error in before:owner:delete instead)
			// For this example, we'll just log a warning
		}

		console.log(`[OwnerHooks] Owner deleted: ${owner.email}`)
	}
}
