import { Injectable, OnModuleInit } from '@nestjs/common'
import { SettingsService } from '~/modules/settings'

@Injectable()
export class InternationalizationService implements OnModuleInit {
	private locales: string[] = ['en']
	private defaultLocale = 'en'

	constructor(private readonly settingsService: SettingsService) {}

	async onModuleInit() {
		await this.loadSettings()
	}

	async loadSettings() {
		try {
			const settings = await this.settingsService.getSettingsByGroup(
				'Internationalization',
			)

			// Find the locales setting
			const localesSetting = settings.find((s) => s.key === 'locales')
			if (localesSetting && Array.isArray(localesSetting.value)) {
				this.locales = localesSetting.value
			}

			// Find the default locale setting
			const defaultLocaleSetting = settings.find(
				(s) => s.key === 'defaultLocale',
			)
			if (
				defaultLocaleSetting &&
				typeof defaultLocaleSetting.value === 'string'
			) {
				this.defaultLocale = defaultLocaleSetting.value
			}
		} catch (error) {
			console.error('Failed to load internationalization settings:', error)
		}
	}

	getLocales(): string[] {
		return this.locales
	}

	getDefaultLocale(): string {
		return this.defaultLocale
	}

	async setLocales(locales: string[]): Promise<void> {
		this.locales = locales
		await this.settingsService.updateSetting('locales', locales)
	}

	async setDefaultLocale(locale: string): Promise<void> {
		if (!this.locales.includes(locale)) {
			throw new Error(
				`Default locale '${locale}' is not included in locales: ${this.locales.join(', ')}`,
			)
		}

		this.defaultLocale = locale
		await this.settingsService.updateSetting('defaultLocale', locale)
	}

	async addLocale(locale: string): Promise<void> {
		if (this.locales.includes(locale)) {
			return
		}

		const newLocales = [...this.locales, locale]
		await this.setLocales(newLocales)
	}

	async removeLocale(locale: string): Promise<void> {
		if (locale === this.defaultLocale) {
			throw new Error(`Cannot remove default locale '${locale}'`)
		}

		if (!this.locales.includes(locale)) {
			return
		}

		const newLocales = this.locales.filter((l) => l !== locale)
		await this.setLocales(newLocales)
	}
}
