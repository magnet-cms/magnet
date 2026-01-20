// @ts-expect-error - fumadocs-ui tailwind plugin types may not be available
import { createPreset } from 'fumadocs-ui/tailwind-plugin'
import type { Config } from 'tailwindcss'

const config: Config = {
	darkMode: 'class',
	presets: [createPreset()],
	content: [
		'./node_modules/fumadocs-ui/dist/**/*.js',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./content/**/*.mdx',
		'./mdx-components.tsx',
	],
}

export default config
