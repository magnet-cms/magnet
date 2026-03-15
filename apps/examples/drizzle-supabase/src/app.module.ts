// IMPORTANT: Set database adapter FIRST, before any schema imports
import { setDatabaseAdapter } from '@magnet-cms/common'
setDatabaseAdapter('drizzle')

import { SupabaseAuthStrategy } from '@magnet-cms/adapter-auth-supabase'
import { AuthStrategyFactory, MagnetModule } from '@magnet-cms/core'
import { ContentBuilderPlugin } from '@magnet-cms/plugin-content-builder'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ArticlesModule } from './modules/articles/articles.module'
import { CatsModule } from './modules/cats/cats.module'
import { OwnersModule } from './modules/owners/owners.module'

// Register Supabase auth strategy before module initialization
AuthStrategyFactory.registerStrategy('supabase', SupabaseAuthStrategy)

/**
 * Example application using Magnet CMS with full Supabase integration.
 *
 * This demonstrates:
 * - Drizzle ORM adapter with PostgreSQL (via Supabase)
 * - Supabase Auth strategy for authentication
 * - Supabase Storage adapter for file uploads
 * - DB vault for secrets management
 * - Content Builder plugin
 * - Admin UI serving
 * - Local development with Docker Compose
 *
 * To run this example:
 * 1. Copy .env.example to .env
 * 2. Run: bun run docker:up
 * 3. Run: bun run dev
 * 4. Access Supabase Studio at http://localhost:3010
 */
@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		MagnetModule.forRoot({
			// Database: PostgreSQL via Drizzle
			db: {
				connectionString:
					process.env.DATABASE_URL ||
					'postgresql://postgres:postgres@localhost:5432/postgres',
				dialect: 'postgresql',
				driver: 'pg',
				debug: process.env.NODE_ENV === 'development',
			},
			// JWT configuration (required)
			jwt: {
				secret:
					process.env.JWT_SECRET ||
					'super-secret-jwt-token-with-at-least-32-characters-long',
			},
			admin: true,
			// Auth: Supabase Auth
			auth: {
				strategy: 'supabase',
				supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:8000',
				supabaseKey: process.env.SUPABASE_ANON_KEY || '',
				supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
			},
			// Storage: Supabase Storage
			storage: {
				adapter: 'supabase',
				supabase: {
					supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:8000',
					supabaseKey: process.env.SUPABASE_SERVICE_KEY || '',
					bucket: process.env.SUPABASE_STORAGE_BUCKET || 'media',
				},
			},
			vault: { adapter: 'db' },
			plugins: [{ plugin: ContentBuilderPlugin }],
		}),
		CatsModule,
		OwnersModule,
		ArticlesModule,
	],
})
export class AppModule {}
