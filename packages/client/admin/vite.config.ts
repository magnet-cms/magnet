import { resolve } from 'node:path'
import { URL, fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Base path for assets - defaults to /admin/ for NestJS embedding
// Set VITE_BASE_PATH env var to customize (e.g., '/' for standalone)
const basePath = process.env.VITE_BASE_PATH || '/admin/'

// https://vitejs.dev/config/
export default defineConfig({
	base: basePath,
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: [
			{
				find: '~',
				replacement: fileURLToPath(new URL('./src', import.meta.url)),
			},
			// Admin (for plugin imports)
			{
				find: '@magnet/admin',
				replacement: fileURLToPath(new URL('./src', import.meta.url)),
			},
			// UI
			{
				find: '@magnet/ui',
				replacement: fileURLToPath(new URL('../ui/src', import.meta.url)),
			},
			{
				find: '@',
				replacement: fileURLToPath(new URL('../ui/src', import.meta.url)),
			},
			// Utils
			{
				find: '@magnet/utils',
				replacement: fileURLToPath(new URL('../../utils/src', import.meta.url)),
			},
		],
		// Ensure single instance of react-router-dom across all imports
		dedupe: ['react', 'react-dom', 'react-router-dom'],
	},
	build: {
		outDir: 'dist/client',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				index: resolve(__dirname, 'index.html'),
			},
			output: {
				entryFileNames: 'static/[name].global.js',
				chunkFileNames: 'static/[name].[hash].js',
				assetFileNames: 'static/[name].[ext]',
			},
		},
	},
	server: {
		hmr: true,
		port: 3001,
	},
})
