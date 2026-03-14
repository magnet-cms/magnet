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
 * General settings schema.
 *
 * Top-level settings group covering site-wide configuration, internationalization,
 * and timezone. This is the single source of truth for base URL (consumed by
 * the email service for link generation) and locale configuration (consumed by
 * InternationalizationService and the admin UI).
 *
 * @example
 * ```typescript
 * const general = await settingsService.get(GeneralSettings)
 * console.log(general.baseUrl)      // 'https://myapp.com'
 * console.log(general.defaultLocale) // 'en'
 * ```
 */
@Settings({
	group: 'general',
	label: 'General',
	icon: 'settings',
	order: 1,
	description: 'Site-wide configuration, internationalization, and timezone',
	sections: [
		{
			name: 'site',
			label: 'Site',
			icon: 'globe',
			description: 'Basic site information used across the CMS',
			order: 1,
		},
		{
			name: 'i18n',
			label: 'Internationalization',
			icon: 'languages',
			description: 'Configure available languages and the default locale',
			order: 2,
		},
		{
			name: 'timezone',
			label: 'Timezone',
			icon: 'clock',
			description: 'Configure timezone settings',
			order: 3,
		},
		{
			name: 'behavior',
			label: 'Behavior',
			icon: 'settings-2',
			description: 'Configure localization behavior',
			order: 4,
		},
	],
})
export class GeneralSettings {
	// Site
	@SettingField.Text({
		label: 'Site Name',
		description: 'The display name of your site',
		default: 'Magnet CMS',
		section: 'site',
		order: 1,
	})
	siteName = 'Magnet CMS'

	@SettingField.Text({
		label: 'Base URL',
		description:
			'Base URL of your application (e.g. https://myapp.com). Used in email links and other services.',
		default: 'http://localhost:3000',
		section: 'site',
		order: 2,
	})
	baseUrl = 'http://localhost:3000'

	// Internationalization
	@SettingField.Select({
		label: 'Available Languages',
		description: 'Select which languages are available across the CMS',
		options: locales,
		default: ['en'],
		multiple: true,
		section: 'i18n',
		order: 1,
	})
	locales: string[] = ['en']

	@SettingField.Select({
		label: 'Default Locale',
		description: 'Default language used when no locale is specified',
		options: locales,
		default: 'en',
		section: 'i18n',
		order: 2,
	})
	defaultLocale = 'en'

	@SettingField.Boolean({
		label: 'Require All Locales',
		description: 'Require content to be translated to all enabled locales',
		default: false,
		section: 'i18n',
		order: 3,
	})
	requireAllLocales = false

	// Timezone
	@SettingField.Select({
		label: 'Timezone',
		description: 'Default timezone for date/time display',
		options: timezones,
		default: 'utc',
		section: 'timezone',
		order: 1,
	})
	timezone = 'utc'

	// Behavior
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
