import { Field, Setting } from '@magnet-cms/common'

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
]

export const timezones = [
  { label: 'UTC', value: 'utc' },
  { label: 'Local', value: 'local' },
]

@Setting()
export class Internationalization {
  @Field.Select({ required: true, default: 'en', options: locales })
  defaultLocale!: string

  @Field.Select({
    required: true,
    default: ['en'],
    options: locales,
    multiple: true,
  })
  locales!: string[]

  @Field.Select({ required: true, default: 'utc', options: timezones })
  timezone!: string

  @Field.Boolean({ required: false, default: false })
  autoDetectLocale!: boolean

  @Field.Boolean({ required: false, default: false })
  fallbackToDefaultLocale!: boolean
}
