import { Prop, Setting, UI } from '@magnet-cms/common'

export const locales = [
	{ key: 'English', value: 'en' },
	{ key: 'Spanish', value: 'es' },
	{ key: 'French', value: 'fr' },
	{ key: 'German', value: 'de' },
	{ key: 'Italian', value: 'it' },
	{ key: 'Portuguese', value: 'pt' },
	{ key: 'Russian', value: 'ru' },
	{ key: 'Chinese', value: 'zh' },
	{ key: 'Japanese', value: 'ja' },
	{ key: 'Korean', value: 'ko' },
	{ key: 'Arabic', value: 'ar' },
]

export const timezones = [
	{ key: 'UTC', value: 'utc' },
	{ key: 'Local', value: 'local' },
]

@Setting()
export class Internationalization {
	@Prop({ required: true, default: 'en' })
	@UI({ type: 'select', options: locales })
	defaultLocale!: string

	@Prop({ required: true, default: ['en'] })
	@UI({ type: 'select', options: locales, multi: true })
	locales!: string[]

	@Prop({ required: true, default: 'utc' })
	@UI({ type: 'select', options: timezones })
	timezone!: string

	@Prop({ required: false, default: false })
	@UI({ type: 'checkbox', side: true })
	autoDetectLocale!: boolean

	@Prop({ required: false, default: false })
	@UI({ type: 'checkbox', side: true })
	fallbackToDefaultLocale!: boolean
}
