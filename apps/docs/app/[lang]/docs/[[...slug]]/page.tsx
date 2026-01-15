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
  params: Promise<{ slug?: string[]; lang: Locale }>
}) {
  const params = await props.params
  const page = source.getPage(params.slug, params.lang)

  if (!page) notFound()

  const MDX = page.data.body

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={{
        style: 'clerk',
      }}
      editOnGithub={{
        repo: 'magnet',
        owner: 'magnetcms',
        sha: 'main',
        path: `apps/docs/content/docs/${params.lang}/${page.file.path}`,
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[]; lang: Locale }>
}) {
  const params = await props.params
  const page = source.getPage(params.slug, params.lang)

  if (!page) notFound()

  return {
    title: page.data.title,
    description: page.data.description,
  }
}
