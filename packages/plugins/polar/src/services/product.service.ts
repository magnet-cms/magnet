import type { BaseSchema, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { PolarProduct } from '../schemas/product.schema'

@Injectable()
export class PolarProductService {
	constructor(
		@InjectModel(PolarProduct)
		private readonly productModel: Model<PolarProduct>,
	) {}

	/**
	 * Upsert a product from a webhook product payload.
	 */
	async syncProduct(data: {
		id: string
		name: string
		description?: string | null
		isRecurring: boolean
		isArchived: boolean
		organizationId?: string
		metadata?: Record<string, string | number | boolean>
	}): Promise<BaseSchema<PolarProduct>> {
		const productData: Partial<PolarProduct> = {
			polarProductId: data.id,
			name: data.name,
			description: data.description ?? undefined,
			isRecurring: data.isRecurring,
			isArchived: data.isArchived,
			organizationId: data.organizationId,
			metadata: data.metadata,
			updatedAt: new Date(),
		}

		const existing = await this.productModel.findOne({
			polarProductId: data.id,
		} as Partial<BaseSchema<PolarProduct>>)

		if (existing) {
			return this.productModel.update(
				{ polarProductId: data.id } as Partial<BaseSchema<PolarProduct>>,
				productData as Partial<BaseSchema<PolarProduct>>,
			)
		}

		return this.productModel.create(
			productData as Partial<BaseSchema<PolarProduct>>,
		)
	}

	/**
	 * Delete a product by Polar Product ID.
	 */
	async deleteProduct(polarProductId: string): Promise<void> {
		await this.productModel.delete({
			polarProductId,
		} as Partial<BaseSchema<PolarProduct>>)
	}

	/**
	 * List all non-archived products.
	 */
	async findActiveProducts(): Promise<BaseSchema<PolarProduct>[]> {
		return this.productModel.findMany({
			isArchived: false,
		} as Partial<BaseSchema<PolarProduct>>)
	}

	/**
	 * List all products.
	 */
	async findAllProducts(): Promise<BaseSchema<PolarProduct>[]> {
		return this.productModel.find()
	}
}
