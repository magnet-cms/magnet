import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Vite config for building the plugin frontend as a UMD bundle
 *
 * The bundle is loaded at runtime by the admin app via script injection.
 * Shared dependencies are externalized and accessed via window globals
 * provided by the host application.
 */
export default defineConfig({
	plugins: [react()],
	define: {
		// Replace process.env.NODE_ENV for browser compatibility
		'process.env.NODE_ENV': JSON.stringify('production'),
	},
	build: {
		outDir: 'dist/frontend',
		lib: {
			entry: resolve(__dirname, 'src/frontend/index.ts'),
			name: 'MagnetPluginContentBuilder',
			formats: ['iife'],
			fileName: () => 'bundle.iife.js',
		},
		rollupOptions: {
			// Externalize deps that are provided by the host app
			external: [
				'react',
				'react-dom',
				'react/jsx-runtime',
				'react/jsx-dev-runtime',
				'react-router-dom',
				'lucide-react',
				// Externalize all @magnet-cms/* packages
				/^@magnet\/.*/,
				// Externalize dnd-kit
				/^@dnd-kit\/.*/,
			],
			output: {
				globals: {
					react: 'React',
					'react-dom': 'ReactDOM',
					'react/jsx-runtime': 'ReactJsxRuntime',
					'react/jsx-dev-runtime': 'ReactJsxRuntime',
					'react-router-dom': 'ReactRouterDOM',
					'lucide-react': 'LucideReact',
					'@magnet-cms/ui/components': 'MagnetUI',
					'@magnet-cms/ui/lib': 'MagnetUILib',
					'@magnet-cms/admin': 'MagnetAdmin',
					'@magnet-cms/utils': 'MagnetUtils',
					'@dnd-kit/core': 'DndKitCore',
					'@dnd-kit/sortable': 'DndKitSortable',
					'@dnd-kit/utilities': 'DndKitUtilities',
				},
				// Ensure assets are inlined
				assetFileNames: 'assets/[name].[ext]',
			},
		},
		// Don't minify for easier debugging (can enable in production)
		minify: false,
		sourcemap: true,
	},
	resolve: {
		alias: {
			'~': resolve(__dirname, 'src/frontend'),
		},
	},
})
