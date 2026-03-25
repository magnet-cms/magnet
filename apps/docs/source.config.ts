import { defineConfig, defineDocs } from 'fumadocs-mdx/config'
import type { ZodTypeAny } from 'zod'

/** Anchors Zod to the workspace copy so the `docs` export satisfies portable type checks. */
export type MagnetDocsZodAnchor = ZodTypeAny

export const docs = defineDocs({
  dir: 'content/docs',
})

export default defineConfig()
