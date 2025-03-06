export interface IntlOptions {
	locales: string[]
	defaultLocale: string
}

export interface LocalizedField {
	[locale: string]: any
}

export interface LocaleOptions {
	locale: string
}
