import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { ReactNode } from 'react'
import { source } from '@/lib/source'
import { baseOptions } from '@/app/layout.config'
import type { Locale } from '@/lib/i18n'
import { i18n, getLanguageLabel } from '@/lib/i18n'

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ lang: Locale }>
}) {
  const { lang } = await params

  return (
    <DocsLayout
      tree={source.pageTree[lang]}
      {...baseOptions}
      sidebar={{
        defaultOpenLevel: 1,
      }}
      i18n={{
        locale: lang,
        onChange: (newLocale) => {
          // Client-side navigation handled by DocsLayout
        },
        locales: i18n.languages.map((locale) => ({
          locale,
          name: getLanguageLabel(locale),
        })),
      }}
    >
      {children}
    </DocsLayout>
  )
}
