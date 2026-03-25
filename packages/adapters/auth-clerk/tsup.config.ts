import baseConfig from '@repo/tsup/config'
import { defineConfig } from 'tsup'

export default defineConfig({
  ...baseConfig,
  // @magnet-cms/core is lazily required at runtime — keep external to avoid
  // pulling NestJS internals (which have unresolvable optional peer deps)
  external: ['@magnet-cms/core', /^@nestjs\//],
})
