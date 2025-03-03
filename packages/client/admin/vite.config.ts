import { resolve } from 'node:path'
import { URL, fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
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
		hmr: true,
		port: 3001,
	},
})
