import { SupabaseAuthAdapter } from '@magnet-cms/adapter-auth-supabase'
import { DrizzleDatabaseAdapter } from '@magnet-cms/adapter-db-drizzle'
import { SupabaseStorageAdapter } from '@magnet-cms/adapter-storage-supabase'
import { SupabaseVaultAdapter } from '@magnet-cms/adapter-vault-supabase'
import { MagnetModule } from '@magnet-cms/core'
import { ContentBuilderPlugin } from '@magnet-cms/plugin-content-builder'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ArticlesModule } from './modules/articles/articles.module'
import { CatsModule } from './modules/cats/cats.module'
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module'
import { OwnersModule } from './modules/owners/owners.module'
import { VeterinariansModule } from './modules/veterinarians/veterinarians.module'

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
		MagnetModule.forRoot(
			[
				DrizzleDatabaseAdapter.forRoot({
					dialect: 'postgresql',
					driver: 'pg',
					debug: process.env.NODE_ENV === 'development',
					migrations: {
						mode: 'auto',
						directory: './migrations',
					},
				}),
				SupabaseAuthAdapter.forRoot(),
				SupabaseStorageAdapter.forRoot(),
				SupabaseVaultAdapter.forRoot(),
				ContentBuilderPlugin.forRoot(),
			],
			{ admin: true },
		),
		CatsModule,
		OwnersModule,
		VeterinariansModule,
		MedicalRecordsModule,
		ArticlesModule,
	],
})
export class AppModule {}
