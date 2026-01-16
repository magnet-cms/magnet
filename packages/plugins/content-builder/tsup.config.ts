import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts', 'src/backend/index.ts'],
	format: ['esm', 'cjs'],
	treeshake: true,
	clean: true,
	dts: true,
	external: ['@magnet/common', '@magnet/core', '@nestjs/common'],
})
