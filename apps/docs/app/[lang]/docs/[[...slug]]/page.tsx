import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page'

export default async function Page() {
  return (
    <DocsPage>
      <DocsTitle>Documentation</DocsTitle>
      <DocsDescription>Documentation is loading...</DocsDescription>
      <DocsBody>
        <p>Content will be available soon.</p>
      </DocsBody>
    </DocsPage>
  )
}

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return []
}

export async function generateMetadata() {
  return {
    title: 'Documentation',
    description: 'Magnet documentation',
  }
}
