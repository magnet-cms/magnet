import { BaseSchema, InjectModel, Model } from '@magnet-cms/common'
import { Hook } from '@magnet-cms/core'
import { Injectable } from '@nestjs/common'

import { MedicalRecord } from '../../medical-records/schemas/medical-record.schema'
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
    @InjectModel(MedicalRecord)
    private medicalRecordModel: Model<MedicalRecord>,
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

    // Create initial health record
    try {
      await this.medicalRecordModel.create({
        cat: cat.id,
        date: new Date(),
        type: 'checkup',
        description: 'Initial health checkup - new cat registration',
        cost: 0,
      })
    } catch (error) {
      console.error('[CatHooks] Failed to create initial health record:', error)
    }
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
    // Check for active medical records
    const recentRecords = await this.medicalRecordModel
      .query()
      .where({ cat: cat.id })
      .and({ date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }) // Last 30 days
      .exec()

    if (recentRecords.length > 0) {
      throw new Error(
        `Cannot delete cat ${cat.tagID}: Has ${recentRecords.length} recent medical record(s). Please archive instead.`,
      )
    }

    return true
  }
}
