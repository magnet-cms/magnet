import {
	BaseSchema,
	DatabaseAdapter,
	MagnetModuleOptions,
	MongooseConfig,
} from '@magnet/common'
import { DynamicModule, Injectable, Type } from '@nestjs/common'
import { MongooseModule, SchemaFactory, getModelToken } from '@nestjs/mongoose'
import mongoose, { Document, Model as MongooseModel, Schema } from 'mongoose'

import { InternationalizationService } from './internationalization/intl.service'
import { createModel } from './mongoose.model'

@Injectable()
class MongooseAdapter extends DatabaseAdapter {
	private options: MagnetModuleOptions | null = null
	private readonly intlService: InternationalizationService

	constructor() {
		super()
		this.intlService = new InternationalizationService()
	}

	connect(options: MagnetModuleOptions): DynamicModule {
		this.options = options

		if (mongoose.connection.readyState === 1) {
			return {
				module: MongooseModule,
				imports: [],
				providers: [],
				exports: [],
			}
		}

		return MongooseModule.forRootAsync({
			useFactory: () => ({
				uri: (options.db as MongooseConfig).uri,
			}),
		})
	}

	forFeature(schemas: Type | Type[]): DynamicModule {
		const schemaArray = Array.isArray(schemas) ? schemas : [schemas]

		const schemasFactory = schemaArray.map((schema) => {
			const mongooseSchema = SchemaFactory.createForClass(schema)

			this.applyInternationalization(mongooseSchema)

			return {
				name: schema.name,
				schema: mongooseSchema,
			}
		})

		return MongooseModule.forFeature(schemasFactory)
	}

	model<T>(modelInstance: any): any {
		return createModel<T>(
			modelInstance as MongooseModel<Document & BaseSchema<T>>,
		)
	}

	token(schema: string): string {
		return getModelToken(schema)
	}

	/**
	 * Apply internationalization to a schema if it has properties with intl: true
	 * @param schema The Mongoose schema to apply internationalization to
	 */
	private applyInternationalization(schema: Schema) {
		// Check if the schema has any properties with intl: true
		let hasIntlProperties = false
		schema.eachPath((path, schemaType) => {
			if (schemaType.options?.intl) {
				hasIntlProperties = true
			}
		})

		// If the schema has intl properties, apply the internationalization plugin
		if (hasIntlProperties) {
			// Get the locales from the application settings or use default
			// If we have options with internationalization settings, use those
			const intlSettings = this.options?.internationalization
			if (intlSettings) {
				const locales = intlSettings.locales
				const defaultLocale = intlSettings.defaultLocale
				this.intlService.applyIntl(schema, { locales, defaultLocale })
			} else {
				throw new Error('Missing internationalization configurations')
			}
		}
	}
}

export const Adapter = new MongooseAdapter()
