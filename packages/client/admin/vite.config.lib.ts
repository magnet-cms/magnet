import { resolve } from 'node:path'
import { URL, fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

/**
 * Vite configuration for building @magnet-cms/admin as a library
 *
 * Usage:
 *   bun run build:lib
 *   # or
 *   vite build --config vite.config.lib.ts
 *
 * This produces:
 *   - dist/lib/index.js (ESM)
 *   - dist/lib/index.cjs (CommonJS)
 *   - dist/lib/index.d.ts (TypeScript declarations)
 *   - dist/lib/styles.css (CSS bundle)
 */
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		dts({
			include: ['src'],
			exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
			rollupTypes: true,
			outDir: 'dist/lib',
		}),
	],
	resolve: {
		alias: [
			{
				find: '~',
				replacement: fileURLToPath(new URL('./src', import.meta.url)),
			},
			// UI - these will be external in lib build
			{
				find: '@magnet-cms/ui',
				replacement: fileURLToPath(new URL('../ui/src', import.meta.url)),
			},
			{
				find: '@',
				replacement: fileURLToPath(new URL('../ui/src', import.meta.url)),
			},
			// Utils
			{
				find: '@magnet-cms/utils',
				replacement: fileURLToPath(new URL('../../utils/src', import.meta.url)),
			},
		],
	},
	build: {
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'MagnetAdmin',
			formats: ['es', 'cjs'],
			fileName: (format) => {
				if (format === 'es') return 'index.js'
				if (format === 'cjs') return 'index.cjs'
				return `index.${format}.js`
			},
		},
		outDir: 'dist/lib',
		emptyOutDir: true,
		sourcemap: true,
		rollupOptions: {
			// Externalize dependencies that shouldn't be bundled
			external: [
				'react',
				'react-dom',
				'react/jsx-runtime',
				'react-router-dom',
				'@tanstack/react-query',
				// Peer dependencies
				'@radix-ui/react-accordion',
				'@radix-ui/react-alert-dialog',
				'@radix-ui/react-avatar',
				'@radix-ui/react-checkbox',
				'@radix-ui/react-collapsible',
				'@radix-ui/react-dialog',
				'@radix-ui/react-dropdown-menu',
				'@radix-ui/react-icons',
				'@radix-ui/react-label',
				'@radix-ui/react-popover',
				'@radix-ui/react-scroll-area',
				'@radix-ui/react-select',
				'@radix-ui/react-separator',
				'@radix-ui/react-slot',
				'@radix-ui/react-switch',
				'@radix-ui/react-tabs',
				'@radix-ui/react-toast',
				'@radix-ui/react-tooltip',
				'lucide-react',
				'class-variance-authority',
				'clsx',
				'tailwind-merge',
				'react-hook-form',
				'@hookform/resolvers',
				'zod',
			],
			output: {
				// Provide globals for UMD build (if needed in future)
				globals: {
					react: 'React',
					'react-dom': 'ReactDOM',
					'react/jsx-runtime': 'jsxRuntime',
					'react-router-dom': 'ReactRouterDOM',
					'@tanstack/react-query': 'ReactQuery',
				},
				// Preserve module structure for tree-shaking
				preserveModules: false,
				// CSS extraction
				assetFileNames: (assetInfo) => {
					if (assetInfo.name === 'style.css') return 'styles.css'
					return assetInfo.name || 'asset'
				},
			},
		},
		// Minify for production
		minify: 'esbuild',
		// Target modern browsers
		target: 'es2020',
	},
	// CSS configuration
	css: {
		// Extract CSS to separate file
		modules: {
			localsConvention: 'camelCase',
		},
	},
})
