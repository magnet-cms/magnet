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
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const locale = lang as Locale

  return (
    <DocsLayout
      tree={source.pageTree[locale]!}
      {...baseOptions}
      sidebar={{
        defaultOpenLevel: 1,
      }}
      i18n
    >
      {children}
    </DocsLayout>
  )
}
