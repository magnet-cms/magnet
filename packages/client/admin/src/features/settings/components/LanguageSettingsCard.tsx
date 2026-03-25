'use client'

import {
  Card,
  CardContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@magnet-cms/ui'
import { Globe } from 'lucide-react'

import { type MessageId, useAppIntl } from '~/i18n'
import { type SupportedLocale, useLocale } from '~/i18n/provider'

const LOCALE_LABELS: Record<string, { id: MessageId; defaultMessage: string }> = {
  en: { id: 'settings.language.en', defaultMessage: 'English' },
  'pt-BR': {
    id: 'settings.language.pt-BR',
    defaultMessage: 'Português (Brasil)',
  },
  es: { id: 'settings.language.es', defaultMessage: 'Español' },
}

/**
 * Client-side language selector card for the General Settings tab.
 * Persists locale to localStorage via the i18n provider.
 */
export function LanguageSettingsCard() {
  const intl = useAppIntl()
  const { locale, setLocale, supportedLocales } = useLocale()

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <Globe className="size-[18px] text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">
          {intl.formatMessage({
            id: 'settings.language.title',
            defaultMessage: 'Language',
          })}
        </h2>
      </div>
      <CardContent className="px-6 pb-6">
        <p className="mb-6 text-xs text-muted-foreground">
          {intl.formatMessage({
            id: 'settings.language.description',
            defaultMessage: 'Choose the language for the admin interface.',
          })}
        </p>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {intl.formatMessage({
              id: 'settings.language.label',
              defaultMessage: 'Interface Language',
            })}
          </Label>
          <Select value={locale} onValueChange={(v) => setLocale(v as SupportedLocale)}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportedLocales.map((loc) => {
                const label = LOCALE_LABELS[loc]
                return (
                  <SelectItem key={loc} value={loc}>
                    {label
                      ? intl.formatMessage({
                          id: label.id,
                          defaultMessage: label.defaultMessage,
                        })
                      : loc}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
