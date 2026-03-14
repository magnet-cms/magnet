import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [react()],
	define: {
		'process.env.NODE_ENV': JSON.stringify('production'),
	},
	build: {
		outDir: 'dist/frontend',
		lib: {
			entry: resolve(__dirname, 'src/frontend/index.ts'),
			name: 'MagnetPluginVault',
			formats: ['iife'],
			fileName: () => 'bundle.iife.js',
		},
		rollupOptions: {
			external: [
				'react',
				'react-dom',
				'react/jsx-runtime',
				'react/jsx-dev-runtime',
				'react-router-dom',
				'lucide-react',
				/^@magnet-cms\/.*/,
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
				},
				assetFileNames: 'assets/[name].[ext]',
			},
		},
		minify: false,
		sourcemap: true,
	},
	resolve: {
		alias: {
			'~': resolve(__dirname, 'src/frontend'),
		},
	},
})
