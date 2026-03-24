import { defineConfig } from 'vitest/config'

export const reactConfig = defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.spec.tsx', 'src/**/*.test.tsx', 'src/**/*.spec.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['**/index.ts', '**/__tests__/**'],
			thresholds: {
				lines: 70,
				branches: 65,
			},
		},
	},
})
