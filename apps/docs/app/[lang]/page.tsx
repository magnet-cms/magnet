import Link from 'next/link'
import type { Locale } from '@/lib/i18n'

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang } = await params

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-3xl text-center">
        <h1 className="mb-4 text-5xl font-bold">Magnet</h1>
        <p className="mb-8 text-xl text-fd-muted-foreground">
          {lang === 'pt-BR'
            ? 'Um framework CMS headless moderno construído em NestJS com suporte nativo para Bun.'
            : 'A modern, headless CMS framework built on NestJS with first-class support for Bun.'}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href={`/${lang}/docs`}
            className="rounded-lg bg-fd-primary px-6 py-3 font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
          >
            {lang === 'pt-BR' ? 'Começar' : 'Get Started'}
          </Link>
          <Link
            href="https://github.com/magnetcms/magnet"
            className="rounded-lg border border-fd-border px-6 py-3 font-medium transition-colors hover:bg-fd-accent"
          >
            GitHub
          </Link>
        </div>
      </div>
    </main>
  )
}
