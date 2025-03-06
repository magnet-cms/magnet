import { Injectable, Logger } from '@nestjs/common'
import { Schema } from 'mongoose'
import { IntlOptions } from './intl.interface'

@Injectable()
export class InternationalizationService {
	private readonly logger = new Logger(InternationalizationService.name)
	private readonly defaultOptions: IntlOptions = {
		locales: ['en'],
		defaultLocale: 'en',
	}

	// Store default locale in a WeakMap to avoid adding properties to schema
	private readonly schemaDefaultLocales = new WeakMap<Schema, string>()

	/**
	 * Apply internationalization to a Mongoose schema
	 * @param schema The Mongoose schema to apply internationalization to
	 * @param options Internationalization options
	 */
	applyIntl(schema: Schema, options: Partial<IntlOptions> = {}): void {
		const intlOptions: IntlOptions = { ...this.defaultOptions, ...options }
		const { locales, defaultLocale } = intlOptions

		// Store the default locale in the WeakMap
		this.schemaDefaultLocales.set(schema, defaultLocale)

		if (!locales.includes(defaultLocale)) {
			throw new Error(
				`Default locale '${defaultLocale}' is not included in locales: ${locales.join(', ')}`,
			)
		}

		// Get all paths with intl: true
		const intlPaths: Record<string, any> = {}
		schema.eachPath((path, schemaType) => {
			if (schemaType.options?.intl) {
				intlPaths[path] = schemaType.options
			}
		})

		// No internationalized paths found
		if (Object.keys(intlPaths).length === 0) {
			return
		}

		this.logger.log(
			`Applying internationalization to schema with ${Object.keys(intlPaths).length} paths`,
		)

		// For each path with intl: true, modify the schema
		Object.keys(intlPaths).forEach((path) => {
			this.transformPath(schema, path, intlPaths[path], locales, defaultLocale)
		})

		// Add methods to the schema
		this.addSchemaMethods(schema, locales, defaultLocale)

		// Add hooks to the schema
		this.addSchemaHooks(schema, intlPaths, defaultLocale)
	}

	/**
	 * Transform a schema path to support internationalization
	 */
	private transformPath(
		schema: Schema,
		path: string,
		pathOptions: any,
		locales: string[],
		defaultLocale: string,
	): void {
		const originalType = pathOptions.type

		// Remove the original path
		schema.remove(path)

		// Create a new object with localized fields
		const localizedFields: Record<string, any> = {}
		locales.forEach((locale) => {
			localizedFields[locale] = {
				type: originalType,
				required: locale === defaultLocale ? pathOptions.required : false,
				default: locale === defaultLocale ? pathOptions.default : undefined,
			}
		})

		// Add the new localized field to the schema
		schema.add({ [path]: localizedFields })

		// Add virtual getter/setter for the field
		schema
			.virtual(path)
			.get(function () {
				const locale =
					this.__locale || schema.methods.getDefaultLocale() || defaultLocale
				const localizedValue = this.get(`${path}.${locale}`)

				// Fallback to default locale if the value is not available in the current locale
				if (localizedValue === undefined && locale !== defaultLocale) {
					return this.get(`${path}.${defaultLocale}`)
				}

				return localizedValue
			})
			.set(function (value) {
				const locale =
					this.__locale || schema.methods.getDefaultLocale() || defaultLocale
				this.set(`${path}.${locale}`, value)
			})
	}

	/**
	 * Add internationalization methods to the schema
	 */
	private addSchemaMethods(
		schema: Schema,
		locales: string[],
		defaultLocale: string,
	): void {
		// Method to set locale for the document
		schema.method('setLocale', function (locale: string) {
			if (!locales.includes(locale)) {
				throw new Error(
					`Locale '${locale}' is not supported. Supported locales: ${locales.join(', ')}`,
				)
			}
			this.__locale = locale
			return this
		})

		// Method to get current locale
		schema.method('getLocale', function () {
			return this.__locale || schema.methods.getDefaultLocale() || defaultLocale
		})

		// Method to get all translations for a field
		schema.method('getAllTranslations', function (field: string) {
			const translations: Record<string, any> = {}
			locales.forEach((locale) => {
				translations[locale] = this.get(`${field}.${locale}`)
			})
			return translations
		})

		// Method to set all translations for a field
		schema.method(
			'setAllTranslations',
			function (field: string, translations: Record<string, any>) {
				Object.entries(translations).forEach(([locale, value]) => {
					if (locales.includes(locale)) {
						this.set(`${field}.${locale}`, value)
					}
				})
				return this
			},
		)

		// Static method to set default locale
		schema.static('setDefaultLocale', function (locale: string) {
			if (!locales.includes(locale)) {
				throw new Error(
					`Locale '${locale}' is not supported. Supported locales: ${locales.join(', ')}`,
				)
			}
			schema.statics.__defaultLocale = locale as any
			return this
		})

		// Static method to get default locale
		schema.static(
			'getDefaultLocale',
			() => schema.statics.__defaultLocale || defaultLocale,
		)
	}

	/**
	 * Add hooks to the schema
	 */
	private addSchemaHooks(
		schema: Schema,
		intlPaths: Record<string, any>,
		defaultLocale: string,
	): void {
		// Initialize locale on document load
		schema.pre('init', function () {
			this.__locale = schema.methods.getDefaultLocale() || defaultLocale
		})

		// Validate required fields in default locale before save
		schema.pre('save', function (next) {
			const requiredPaths = Object.keys(intlPaths).filter(
				(path) => intlPaths[path].required,
			)
			const currentDefaultLocale =
				schema.methods.getDefaultLocale() || defaultLocale

			for (const path of requiredPaths) {
				const defaultLocaleValue = this.get(`${path}.${currentDefaultLocale}`)
				if (
					defaultLocaleValue === undefined ||
					defaultLocaleValue === null ||
					defaultLocaleValue === ''
				) {
					return next(
						new Error(
							`Path '${path}' is required in default locale '${currentDefaultLocale}'`,
						),
					)
				}
			}
			next()
		})
	}

	/**
	 * Get the default locale for a schema
	 */
	getSchemaDefaultLocale(schema: Schema): string {
		return (
			this.schemaDefaultLocales.get(schema) || this.defaultOptions.defaultLocale
		)
	}
}
