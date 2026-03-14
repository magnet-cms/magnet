import { SettingField, Settings } from '@magnet-cms/common'

export const locales = [
	{ label: 'English', value: 'en' },
	{ label: 'Spanish', value: 'es' },
	{ label: 'French', value: 'fr' },
	{ label: 'German', value: 'de' },
	{ label: 'Italian', value: 'it' },
	{ label: 'Portuguese', value: 'pt' },
	{ label: 'Russian', value: 'ru' },
	{ label: 'Chinese', value: 'zh' },
	{ label: 'Japanese', value: 'ja' },
	{ label: 'Korean', value: 'ko' },
	{ label: 'Arabic', value: 'ar' },
] as const

export const timezones = [
	{ label: 'UTC', value: 'utc' },
	{ label: 'Local', value: 'local' },
] as const

/**
 * Internationalization settings schema.
 *
 * This is the single source of truth for locale and timezone configuration
 * across the entire CMS. All subsystems (DocumentService, content manager UI,
 * HTTP adapter) read from this settings group.
 *
 * @example
 * ```typescript
 * const intlConfig = await settingsService.get(InternationalizationSettings)
 * console.log(intlConfig.defaultLocale) // 'en'
 * console.log(intlConfig.locales)       // ['en', 'fr']
 * ```
 */
@Settings({
	group: 'internationalization',
	label: 'Internationalization',
	icon: 'languages',
	order: 3,
	description: 'Configure language, locale, and timezone settings for the CMS',
	sections: [
		{
			name: 'locales',
			label: 'Languages',
			icon: 'globe',
			description: 'Configure available languages and the default locale',
			order: 1,
		},
		{
			name: 'timezone',
			label: 'Timezone',
			icon: 'clock',
			description: 'Configure timezone settings',
			order: 2,
		},
		{
			name: 'behavior',
			label: 'Behavior',
			icon: 'settings-2',
			description: 'Configure localization behavior',
			order: 3,
		},
	],
})
export class InternationalizationSettings {
	@SettingField.Select({
		label: 'Available Languages',
		description: 'Select which languages are available across the CMS',
		options: locales,
		default: ['en'],
		multiple: true,
		section: 'locales',
		order: 1,
	})
	locales: string[] = ['en']

	@SettingField.Select({
		label: 'Default Locale',
		description: 'Default language used when no locale is specified',
		options: locales,
		default: 'en',
		section: 'locales',
		order: 2,
	})
	defaultLocale = 'en'

	@SettingField.Boolean({
		label: 'Require All Locales',
		description: 'Require content to be translated to all enabled locales',
		default: false,
		section: 'locales',
		order: 3,
	})
	requireAllLocales = false

	@SettingField.Select({
		label: 'Timezone',
		description: 'Default timezone for date/time display',
		options: timezones,
		default: 'utc',
		section: 'timezone',
		order: 1,
	})
	timezone = 'utc'

	@SettingField.Boolean({
		label: 'Auto-detect Locale',
		description: 'Automatically detect the user locale from browser settings',
		default: false,
		section: 'behavior',
		order: 1,
	})
	autoDetectLocale = false

	@SettingField.Boolean({
		label: 'Fallback to Default Locale',
		description:
			'Fall back to the default locale when content is missing in the requested locale',
		default: false,
		section: 'behavior',
		order: 2,
	})
	fallbackToDefaultLocale = false
}
