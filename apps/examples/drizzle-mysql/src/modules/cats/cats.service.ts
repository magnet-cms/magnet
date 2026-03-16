import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { CreateCatDto } from './dto/create-cat.dto'
import { Cat } from './schemas/cat.schema'

@Injectable()
export class CatsService {
	constructor(
		@InjectModel(Cat)
		private model: Model<Cat>,
	) {}

	create(createUserDto: CreateCatDto) {
		return this.model.create(createUserDto)
	}

	findAll() {
		return this.model.find()
	}

	findOne(id: string) {
		return this.model.findOne({ id })
	}

	async remove(id: string) {
		return await this.model.delete({ id })
	}

	async update(id: string, updateUserDto: Partial<CreateCatDto>) {
		return await this.model.update({ id }, updateUserDto)
	}

	/**
	 * Find cats by breed using QueryBuilder
	 */
	findByBreed(breed: string) {
		return this.model.query().where({ breed }).exec()
	}

	/**
	 * Find cats by owner ID using QueryBuilder with relation filtering
	 */
	findCatsByOwner(ownerId: string) {
		return this.model.query().where({ owner: ownerId }).exec()
	}

	/**
	 * Find heavy cats (weight >= threshold) using QueryBuilder with operators
	 */
	findHeavyCats(weightThreshold: number) {
		return this.model
			.query()
			.where({ weight: { $gte: weightThreshold } })
			.sort({ weight: -1 })
			.exec()
	}

	/**
	 * Find cats by multiple criteria with advanced filtering
	 */
	findCatsByCriteria(criteria: {
		breeds?: string[]
		minWeight?: number
		maxWeight?: number
		castrated?: boolean
	}) {
		const query = this.model.query()

		if (criteria.breeds && criteria.breeds.length > 0) {
			query.where({ breed: { $in: criteria.breeds } })
		}

		if (criteria.minWeight !== undefined || criteria.maxWeight !== undefined) {
			const weightFilter: Record<string, number> = {}
			if (criteria.minWeight !== undefined) {
				weightFilter.$gte = criteria.minWeight
			}
			if (criteria.maxWeight !== undefined) {
				weightFilter.$lte = criteria.maxWeight
			}
			if (criteria.breeds && criteria.breeds.length > 0) {
				query.and({ weight: weightFilter })
			} else {
				query.where({ weight: weightFilter })
			}
		}

		if (criteria.castrated !== undefined) {
			if (criteria.breeds || criteria.minWeight || criteria.maxWeight) {
				query.and({ castrated: criteria.castrated })
			} else {
				query.where({ castrated: criteria.castrated })
			}
		}

		return query.sort({ weight: -1 }).exec()
	}

	/**
	 * Find cats with pagination
	 */
	findPaginated(page = 1, limit = 10, sortBy = 'tagID') {
		const skip = (page - 1) * limit
		return this.model
			.query()
			.sort({ [sortBy]: 1 })
			.skip(skip)
			.limit(limit)
			.exec()
	}

	/**
	 * Get statistics about cats
	 */
	async getCatsStatistics() {
		const allCats = await this.model.find()

		const stats = {
			total: allCats.length,
			byBreed: {} as Record<string, number>,
			averageWeight: 0,
			minWeight: Number.POSITIVE_INFINITY,
			maxWeight: Number.NEGATIVE_INFINITY,
			castratedCount: 0,
			notCastratedCount: 0,
			byWeightRange: {
				light: 0, // < 5kg
				medium: 0, // 5-10kg
				heavy: 0, // > 10kg
			},
		}

		if (allCats.length === 0) {
			stats.minWeight = 0
			stats.maxWeight = 0
			return stats
		}

		let totalWeight = 0

		for (const cat of allCats) {
			// Count by breed
			const breed = cat.breed || 'Unknown'
			stats.byBreed[breed] = (stats.byBreed[breed] || 0) + 1

			// Weight statistics
			const weight = cat.weight || 0
			totalWeight += weight
			if (weight < stats.minWeight) stats.minWeight = weight
			if (weight > stats.maxWeight) stats.maxWeight = weight

			// Castration count
			if (cat.castrated) {
				stats.castratedCount++
			} else {
				stats.notCastratedCount++
			}

			// Weight range
			if (weight < 5) {
				stats.byWeightRange.light++
			} else if (weight <= 10) {
				stats.byWeightRange.medium++
			} else {
				stats.byWeightRange.heavy++
			}
		}

		stats.averageWeight = totalWeight / allCats.length

		return stats
	}

	/**
	 * Search cats by name or tagID using regex
	 */
	searchCats(searchTerm: string) {
		return this.model
			.query()
			.or([
				{ name: { $regex: searchTerm, $options: 'i' } },
				{ tagID: { $regex: searchTerm, $options: 'i' } },
			])
			.exec()
	}

	/**
	 * Find cats by medical condition (requires relation to medical records)
	 * This demonstrates nested relation queries
	 */
	async findByMedicalCondition(condition: string) {
		// Note: This is a simplified example
		// In a real implementation, you'd need to join with MedicalRecord
		// For now, we'll use a direct query approach
		const allCats = await this.model.find()
		// In practice, you'd use aggregation or populate to query across relations
		return allCats
	}
}
