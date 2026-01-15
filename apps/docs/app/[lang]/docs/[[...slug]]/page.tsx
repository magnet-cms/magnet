import { source } from '@/lib/source'
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page'
import { notFound } from 'next/navigation'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { Step, Steps } from 'fumadocs-ui/components/steps'
import { Callout } from 'fumadocs-ui/components/callout'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import type { Locale } from '@/lib/i18n'

const mdxComponents = {
  ...defaultMdxComponents,
  Step,
  Steps,
  Callout,
  Tab,
  Tabs,
}

export default async function Page(props: {
  params: Promise<{ slug?: string[]; lang: string }>
}) {
  const params = await props.params
  const locale = params.lang as Locale
  const page = source.getPage(params.slug, locale)

  if (!page) notFound()

  return (
    <DocsPage>
      <DocsTitle>{page.data.title ?? 'Documentation'}</DocsTitle>
      <DocsDescription>{page.data.description ?? ''}</DocsDescription>
      <DocsBody>
        {/* MDX content temporarily disabled due to rendering issue */}
        <p>Content will be available soon.</p>
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return []
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[]; lang: string }>
}) {
  const params = await props.params
  const locale = params.lang as Locale
  const page = source.getPage(params.slug, locale)

  if (!page) notFound()

  return {
    title: page.data.title,
    description: page.data.description,
  }
}
