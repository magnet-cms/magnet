import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export const nestConfig = defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['reflect-metadata'],
		include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.ts'],
			exclude: [
				'**/index.ts',
				'**/*.module.ts',
				'**/interfaces/**',
				'**/dto/**',
				'**/__tests__/**',
				'**/*.config.ts',
				'**/dist/**',
			],
			thresholds: {
				lines: 80,
				branches: 75,
			},
		},
	},
})
