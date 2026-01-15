import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <>
        <span className="font-bold">Magnet</span>
        <span className="ml-1 text-fd-muted-foreground">Docs</span>
      </>
    ),
  },
  links: [
    {
      text: 'Documentation',
      url: '/docs',
      active: 'nested-url',
    },
    {
      text: 'GitHub',
      url: 'https://github.com/magnetcms/magnet',
      external: true,
    },
  ],
  githubUrl: 'https://github.com/magnetcms/magnet',
}
