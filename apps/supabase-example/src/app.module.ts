// IMPORTANT: Set database adapter FIRST, before any schema imports
import { setDatabaseAdapter } from '@magnet-cms/common'
setDatabaseAdapter('drizzle')

import { SupabaseAuthStrategy } from '@magnet-cms/adapter-supabase'
import { AuthStrategyFactory, MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ArticlesModule } from './modules/articles/articles.module'

// Register Supabase auth strategy before module initialization
AuthStrategyFactory.registerStrategy('supabase', SupabaseAuthStrategy)

/**
 * Example application using Magnet CMS with full Supabase integration.
 *
 * This demonstrates:
 * - Drizzle ORM adapter with PostgreSQL (via Supabase)
 * - Supabase Auth strategy for authentication
 * - Supabase Storage adapter for file uploads
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
			// Auth: Supabase Auth
			auth: {
				strategy: 'supabase',
				supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:8000',
				supabaseKey: process.env.SUPABASE_ANON_KEY || '',
				supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
			},
			// Storage: Local storage for now (Supabase storage requires matching JWT secrets)
			// To enable Supabase storage, ensure SUPABASE_SERVICE_KEY matches the JWT secret
			// used in your Supabase deployment
			storage: {
				adapter: 'local',
				local: {
					uploadDir: './uploads',
					publicPath: '/media',
				},
			},
		}),
		ArticlesModule,
	],
})
export class AppModule {}
