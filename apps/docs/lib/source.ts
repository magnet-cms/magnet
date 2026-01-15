import { docs } from '@/.source'
import { loader, type Source } from 'fumadocs-core/source'
import { i18n } from './i18n'

const fumadocsSource = docs.toFumadocsSource()

// fumadocs-mdx returns files as a function, need to call it to get the array
const filesData = fumadocsSource.files as unknown
const resolvedSource = {
  files: typeof filesData === 'function'
    ? (filesData as () => unknown)()
    : filesData
} as Source

export const source = loader({
  baseUrl: '/docs',
  source: resolvedSource,
  i18n: {
    ...i18n,
    parser: 'dir',
  },
})
