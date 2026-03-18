import { SupabaseAuthStrategy } from '@magnet-cms/adapter-auth-supabase'
import { DrizzleDatabaseAdapter } from '@magnet-cms/adapter-db-drizzle'
import { SupabaseStorageAdapter } from '@magnet-cms/adapter-storage-supabase'
import { SupabaseVaultAdapter } from '@magnet-cms/adapter-vault-supabase'
import { MagnetModule } from '@magnet-cms/core'
import { ContentBuilderPlugin } from '@magnet-cms/plugin-content-builder'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FeaturesModule } from './modules/features.module'

/**
 * Example application using Magnet CMS with full Supabase integration.
 *
 * This demonstrates:
 * - Drizzle ORM adapter with PostgreSQL (via Supabase)
 * - Supabase Auth strategy for authentication
 * - Supabase Storage adapter for file uploads
 * - Supabase Vault (pgsodium) for secrets management
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
		FeaturesModule.forRoot(
			MagnetModule.forRoot(
				[
					DrizzleDatabaseAdapter.forRoot({
						dialect: 'postgresql',
						driver: 'pg',
						debug: process.env.NODE_ENV === 'development',
						// No migrations config: uses CREATE TABLE IF NOT EXISTS.
						// Supabase Auth creates its own tables; auto-migration can conflict.
					}),
					SupabaseAuthStrategy.forRoot(),
					SupabaseStorageAdapter.forRoot(),
					SupabaseVaultAdapter.forRoot(),
					ContentBuilderPlugin.forRoot(),
				],
				{ admin: false },
			),
		),
	],
})
export class AppModule {}
