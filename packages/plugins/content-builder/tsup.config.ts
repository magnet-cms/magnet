import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts', 'src/backend/index.ts'],
	format: ['esm', 'cjs'],
	treeshake: true,
	clean: true,
	dts: true,
	external: ['@magnet-cms/common', '@magnet-cms/core', '@nestjs/common'],
})
