import baseConfig from '@repo/tsup/config'
import { defineConfig } from 'tsup'

export default defineConfig({
	...baseConfig,
	entry: ['src/index.ts', 'src/magnet-module-imports.ts', 'src/modules.ts'],
	// modules.ts imports DatabaseModule from @magnet-cms/core so it uses the same
	// instance (with adapter set by register()) instead of a bundled copy
	external: ['@magnet-cms/core'],
})
