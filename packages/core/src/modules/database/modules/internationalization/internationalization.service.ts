import { Injectable, OnModuleInit } from '@nestjs/common'
import { GeneralSettings } from '~/modules/general/general.settings'
import { MagnetLogger } from '~/modules/logging/logger.service'
import { SettingsService } from '~/modules/settings'

@Injectable()
export class InternationalizationService implements OnModuleInit {
	private locales: string[] = ['en']
	private defaultLocale = 'en'

	constructor(
		private readonly settingsService: SettingsService,
		private readonly logger: MagnetLogger,
	) {
		this.logger.setContext(InternationalizationService.name)
	}

	async onModuleInit() {
		await this.loadSettings()
	}

	async loadSettings() {
		try {
			const settings = await this.settingsService.get(GeneralSettings)
			if (Array.isArray(settings.locales) && settings.locales.length > 0) {
				this.locales = settings.locales
			}
			if (
				typeof settings.defaultLocale === 'string' &&
				settings.defaultLocale
			) {
				this.defaultLocale = settings.defaultLocale
			}
		} catch (error) {
			this.logger.error('Failed to load internationalization settings', error)
		}
	}

	getLocales(): string[] {
		return this.locales
	}

	getDefaultLocale(): string {
		return this.defaultLocale
	}

	async setLocales(newLocales: string[]): Promise<void> {
		this.locales = newLocales
		await this.settingsService.update(GeneralSettings, { locales: newLocales })
	}

	async setDefaultLocale(locale: string): Promise<void> {
		if (!this.locales.includes(locale)) {
			throw new Error(
				`Default locale '${locale}' is not included in locales: ${this.locales.join(', ')}`,
			)
		}

		this.defaultLocale = locale
		await this.settingsService.update(GeneralSettings, {
			defaultLocale: locale,
		})
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
