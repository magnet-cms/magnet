import { resolve } from 'node:path'
import { URL, fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	base: '/admin/',
	resolve: {
		alias: [
			{
				find: '~',
				replacement: fileURLToPath(new URL('./src', import.meta.url)),
			},
			{
				find: '@magnet/ui',
				replacement: fileURLToPath(new URL('../ui/src', import.meta.url)),
			},
			{
				find: '@',
				replacement: fileURLToPath(new URL('../ui/src', import.meta.url)),
			},
			// Add this alias specifically for the pages directory
			{
				find: '@pages',
				replacement: fileURLToPath(new URL('./src/pages', import.meta.url)),
			},
		],
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
		hmr: {
			protocol: 'ws',
			host: 'localhost',
			port: 3001,
			clientPort: 3000,
			path: 'hmr',
		},
		open: false,
		port: 3001,
	},
})
