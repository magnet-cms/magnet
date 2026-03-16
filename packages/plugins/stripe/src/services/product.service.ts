import type { BaseSchema, Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import type Stripe from 'stripe'
import { StripePrice } from '../schemas/price.schema'
import { StripeProduct } from '../schemas/product.schema'

@Injectable()
export class StripeProductService {
	constructor(
		@InjectModel(StripeProduct)
		private readonly productModel: Model<StripeProduct>,
		@InjectModel(StripePrice)
		private readonly priceModel: Model<StripePrice>,
	) {}

	/**
	 * Upsert a product from a Stripe Product object.
	 */
	async syncProduct(
		stripeProduct: Stripe.Product,
	): Promise<BaseSchema<StripeProduct>> {
		const data: Partial<StripeProduct> = {
			stripeProductId: stripeProduct.id,
			name: stripeProduct.name,
			description: stripeProduct.description ?? undefined,
			active: stripeProduct.active,
			metadata: stripeProduct.metadata as Record<string, string>,
			images: stripeProduct.images,
			updatedAt: new Date(),
		}

		const existing = await this.productModel.findOne({
			stripeProductId: stripeProduct.id,
		} as Partial<BaseSchema<StripeProduct>>)

		if (existing) {
			return this.productModel.update(
				{ stripeProductId: stripeProduct.id } as Partial<
					BaseSchema<StripeProduct>
				>,
				data as Partial<BaseSchema<StripeProduct>>,
			)
		}

		return this.productModel.create(data as Partial<BaseSchema<StripeProduct>>)
	}

	/**
	 * Upsert a price from a Stripe Price object.
	 */
	async syncPrice(stripePrice: Stripe.Price): Promise<BaseSchema<StripePrice>> {
		const productId =
			typeof stripePrice.product === 'string'
				? stripePrice.product
				: stripePrice.product.id

		const data: Partial<StripePrice> = {
			stripePriceId: stripePrice.id,
			productId,
			unitAmount: stripePrice.unit_amount ?? 0,
			currency: stripePrice.currency,
			type: stripePrice.type,
			interval: stripePrice.recurring?.interval,
			intervalCount: stripePrice.recurring?.interval_count,
			active: stripePrice.active,
		}

		const existing = await this.priceModel.findOne({
			stripePriceId: stripePrice.id,
		} as Partial<BaseSchema<StripePrice>>)

		if (existing) {
			return this.priceModel.update(
				{ stripePriceId: stripePrice.id } as Partial<BaseSchema<StripePrice>>,
				data as Partial<BaseSchema<StripePrice>>,
			)
		}

		return this.priceModel.create(data as Partial<BaseSchema<StripePrice>>)
	}

	/**
	 * Delete a product by Stripe Product ID.
	 */
	async deleteProduct(stripeProductId: string): Promise<void> {
		await this.productModel.delete({
			stripeProductId,
		} as Partial<BaseSchema<StripeProduct>>)
	}

	/**
	 * Delete a price by Stripe Price ID.
	 */
	async deletePrice(stripePriceId: string): Promise<void> {
		await this.priceModel.delete({
			stripePriceId,
		} as Partial<BaseSchema<StripePrice>>)
	}

	/**
	 * List all active products with their prices.
	 */
	async findActiveProductsWithPrices(): Promise<
		Array<{
			product: BaseSchema<StripeProduct>
			prices: BaseSchema<StripePrice>[]
		}>
	> {
		const products = await this.productModel.findMany({
			active: true,
		} as Partial<BaseSchema<StripeProduct>>)

		const result = []
		for (const product of products) {
			const prices = await this.priceModel.findMany({
				productId: product.stripeProductId,
				active: true,
			} as Partial<BaseSchema<StripePrice>>)
			result.push({ product, prices })
		}

		return result
	}

	/**
	 * List all products.
	 */
	async findAllProducts(): Promise<BaseSchema<StripeProduct>[]> {
		return this.productModel.find()
	}

	/**
	 * List all prices.
	 */
	async findAllPrices(): Promise<BaseSchema<StripePrice>[]> {
		return this.priceModel.find()
	}
}
