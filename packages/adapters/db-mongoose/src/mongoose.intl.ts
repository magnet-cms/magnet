import { Schema } from 'mongoose'

/**
 * Mongoose internationalization plugin
 * Inspired by mongoose-intl
 */
export interface IntlOptions {
	locales: string[]
	defaultLocale: string
}

const defaultOptions: IntlOptions = {
	locales: ['en'],
	defaultLocale: 'en',
}

// Store default locale in a WeakMap to avoid adding properties to schema
const schemaDefaultLocales = new WeakMap<Schema, string>()

/**
 * Apply internationalization to a Mongoose schema
 * @param schema The Mongoose schema to apply internationalization to
 * @param options Internationalization options
 */
export function applyIntl(schema: Schema, options: Partial<IntlOptions> = {}) {
	const intlOptions: IntlOptions = { ...defaultOptions, ...options }
	const { locales, defaultLocale } = intlOptions

	// Store the default locale in the WeakMap
	schemaDefaultLocales.set(schema, defaultLocale)

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

	// For each path with intl: true, modify the schema
	Object.keys(intlPaths).forEach((path) => {
		const pathOptions = intlPaths[path]
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
					this.__locale || schemaDefaultLocales.get(schema) || defaultLocale
				const localizedValue = this.get(`${path}.${locale}`)

				// Fallback to default locale if the value is not available in the current locale
				if (localizedValue === undefined && locale !== defaultLocale) {
					return this.get(`${path}.${defaultLocale}`)
				}

				return localizedValue
			})
			.set(function (value) {
				const locale =
					this.__locale || schemaDefaultLocales.get(schema) || defaultLocale
				this.set(`${path}.${locale}`, value)
			})
	})

	// Add methods to the schema
	schema.method('setLocale', function (locale: string) {
		if (!locales.includes(locale)) {
			throw new Error(
				`Locale '${locale}' is not supported. Supported locales: ${locales.join(', ')}`,
			)
		}
		this.__locale = locale
		return this
	})

	schema.method('getLocale', function () {
		return this.__locale || schemaDefaultLocales.get(schema) || defaultLocale
	})

	// Add method to get all translations for a field
	schema.method('getAllTranslations', function (field: string) {
		if (!intlPaths[field]) {
			throw new Error(`Field '${field}' is not internationalized`)
		}

		const translations: Record<string, any> = {}
		locales.forEach((locale) => {
			translations[locale] = this.get(`${field}.${locale}`)
		})

		return translations
	})

	// Add method to set all translations for a field
	schema.method(
		'setAllTranslations',
		function (field: string, translations: Record<string, any>) {
			if (!intlPaths[field]) {
				throw new Error(`Field '${field}' is not internationalized`)
			}

			Object.entries(translations).forEach(([locale, value]) => {
				if (locales.includes(locale)) {
					this.set(`${field}.${locale}`, value)
				}
			})

			return this
		},
	)

	schema.static('setDefaultLocale', function (locale: string) {
		if (!locales.includes(locale)) {
			throw new Error(
				`Locale '${locale}' is not supported. Supported locales: ${locales.join(', ')}`,
			)
		}
		schemaDefaultLocales.set(schema, locale)
		return this
	})

	schema.static(
		'getDefaultLocale',
		() => schemaDefaultLocales.get(schema) || defaultLocale,
	)

	schema.pre('init', function () {
		this.__locale = schemaDefaultLocales.get(schema) || defaultLocale
	})

	schema.pre('save', function (next) {
		const requiredPaths = Object.keys(intlPaths).filter(
			(path) => intlPaths[path].required,
		)
		const currentDefaultLocale =
			schemaDefaultLocales.get(schema) || defaultLocale

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
