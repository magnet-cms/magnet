import type { ProjectConfig } from '../types.js'

export function generateAppModule(config: ProjectConfig): string {
	const { database, plugins, storage, includeExample, projectName } = config

	const imports: string[] = []
	const moduleImports: string[] = []

	// Database-specific setup
	if (database !== 'mongoose') {
		imports.push("import { setDatabaseAdapter } from '@magnet-cms/common'")
	}

	imports.push("import { MagnetModule } from '@magnet-cms/core'")

	if (database === 'drizzle-supabase') {
		imports.push("import { SupabaseAuthStrategy } from '@magnet-cms/core'")
		imports.push("import { AuthStrategyFactory } from '@magnet-cms/core'")
	}

	// Plugin imports
	if (plugins.includes('content-builder')) {
		imports.push(
			"import { ContentBuilderPlugin } from '@magnet-cms/plugin-content-builder'",
		)
	}
	if (plugins.includes('seo')) {
		imports.push("import { SeoPlugin } from '@magnet-cms/plugin-seo'")
	}

	imports.push("import { Module } from '@nestjs/common'")
	imports.push("import { ConfigModule } from '@nestjs/config'")

	// Example module import
	if (includeExample) {
		imports.push("import { ItemsModule } from './modules/items/items.module'")
		moduleImports.push('ItemsModule')
	}

	// Generate MagnetModule config
	const magnetConfig = generateMagnetConfig(config)

	// Build the file content
	let content = imports.join('\n')
	content += '\n'

	// Add database adapter setup for Drizzle
	if (database !== 'mongoose') {
		content += "\nsetDatabaseAdapter('drizzle')\n"
	}

	// Add Supabase auth strategy registration
	if (database === 'drizzle-supabase') {
		content +=
			"\nAuthStrategyFactory.registerStrategy('supabase', SupabaseAuthStrategy)\n"
	}

	content += `
@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		MagnetModule.forRoot(${magnetConfig}),${moduleImports.length > 0 ? `\n\t\t${moduleImports.join(',\n\t\t')},` : ''}
	],
})
export class AppModule {}
`

	return content
}

function generateMagnetConfig(config: ProjectConfig): string {
	const { database, plugins, storage, projectName } = config

	const lines: string[] = ['{']

	// Database config
	if (database === 'mongoose') {
		lines.push('\t\t\tdb: {')
		lines.push(
			`\t\t\t\turi: process.env.MONGODB_URI || 'mongodb://localhost:27017/${projectName}',`,
		)
		lines.push('\t\t\t},')
	} else if (database === 'drizzle-neon') {
		lines.push('\t\t\tdb: {')
		lines.push(`\t\t\t\tconnectionString: process.env.DATABASE_URL || '',`)
		lines.push(`\t\t\t\tdialect: 'postgresql',`)
		lines.push(`\t\t\t\tdriver: 'neon',`)
		lines.push('\t\t\t\tmigrations: {')
		lines.push(
			`\t\t\t\t\tmode: process.env.NODE_ENV === 'production' ? 'manual' : 'auto',`,
		)
		lines.push(`\t\t\t\t\tdirectory: './migrations',`)
		lines.push('\t\t\t\t},')
		lines.push('\t\t\t},')
	} else if (database === 'drizzle-supabase') {
		lines.push('\t\t\tdb: {')
		lines.push(`\t\t\t\tconnectionString: process.env.DATABASE_URL || '',`)
		lines.push(`\t\t\t\tdialect: 'postgresql',`)
		lines.push(`\t\t\t\tdriver: 'pg',`)
		lines.push('\t\t\t\tmigrations: {')
		lines.push(
			`\t\t\t\t\tmode: process.env.NODE_ENV === 'production' ? 'manual' : 'auto',`,
		)
		lines.push(`\t\t\t\t\tdirectory: './migrations',`)
		lines.push('\t\t\t\t},')
		lines.push('\t\t\t},')
	}

	// JWT config
	lines.push('\t\t\tjwt: {')
	lines.push(
		`\t\t\t\tsecret: process.env.JWT_SECRET || 'development-secret-key',`,
	)
	lines.push('\t\t\t},')

	// Auth config for Supabase
	if (database === 'drizzle-supabase') {
		lines.push('\t\t\tauth: {')
		lines.push(`\t\t\t\tstrategy: 'supabase',`)
		lines.push(`\t\t\t\tsupabaseUrl: process.env.SUPABASE_URL || '',`)
		lines.push(`\t\t\t\tsupabaseKey: process.env.SUPABASE_ANON_KEY || '',`)
		lines.push('\t\t\t},')
	}

	// Storage config
	if (storage !== 'none') {
		lines.push('\t\t\tstorage: {')
		lines.push(`\t\t\t\tadapter: '${storage}',`)
		if (storage === 'local') {
			lines.push('\t\t\t\tlocal: {')
			lines.push(`\t\t\t\t\tuploadDir: './uploads',`)
			lines.push(`\t\t\t\t\tpublicPath: '/media',`)
			lines.push('\t\t\t\t},')
		} else if (storage === 's3') {
			lines.push('\t\t\t\ts3: {')
			lines.push(`\t\t\t\t\tbucket: process.env.S3_BUCKET || '',`)
			lines.push(`\t\t\t\t\tregion: process.env.S3_REGION || 'us-east-1',`)
			lines.push(`\t\t\t\t\taccessKeyId: process.env.S3_ACCESS_KEY_ID || '',`)
			lines.push(
				`\t\t\t\t\tsecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',`,
			)
			lines.push('\t\t\t\t},')
		} else if (storage === 'r2') {
			lines.push('\t\t\t\tr2: {')
			lines.push(`\t\t\t\t\tbucket: process.env.R2_BUCKET || '',`)
			lines.push(`\t\t\t\t\taccountId: process.env.R2_ACCOUNT_ID || '',`)
			lines.push(`\t\t\t\t\taccessKeyId: process.env.R2_ACCESS_KEY_ID || '',`)
			lines.push(
				`\t\t\t\t\tsecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',`,
			)
			lines.push('\t\t\t\t},')
		} else if (storage === 'supabase') {
			lines.push('\t\t\t\tsupabase: {')
			lines.push(`\t\t\t\t\turl: process.env.SUPABASE_URL || '',`)
			lines.push(`\t\t\t\t\tkey: process.env.SUPABASE_SERVICE_KEY || '',`)
			lines.push(
				`\t\t\t\t\tbucket: process.env.SUPABASE_STORAGE_BUCKET || 'media',`,
			)
			lines.push('\t\t\t\t},')
		}
		lines.push('\t\t\t},')
	}

	// Plugins
	if (plugins.length > 0) {
		lines.push('\t\t\tplugins: [')
		for (const plugin of plugins) {
			if (plugin === 'content-builder') {
				lines.push('\t\t\t\t{ plugin: ContentBuilderPlugin },')
			} else if (plugin === 'seo') {
				lines.push('\t\t\t\t{ plugin: SeoPlugin },')
			}
		}
		lines.push('\t\t\t],')
	}

	lines.push('\t\t}')

	return lines.join('\n')
}
