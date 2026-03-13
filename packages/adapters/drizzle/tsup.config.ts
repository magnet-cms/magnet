import baseConfig from '@repo/tsup/config'
import { defineConfig } from 'tsup'

export default defineConfig({
	...baseConfig,
	// drizzle-kit and optional DB drivers are peer/dev deps — keep them external
	external: [
		'drizzle-kit',
		'drizzle-kit/api',
		'@electric-sql/pglite',
		'postgres',
		'@vercel/postgres',
		'@planetscale/database',
		'@libsql/client',
		'mysql2',
		'mysql2/promise',
		'better-sqlite3',
	],
})
