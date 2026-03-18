import { DrizzleDatabaseAdapter } from '@magnet-cms/adapter-db-drizzle'
import { S3StorageAdapter } from '@magnet-cms/adapter-storage-s3'
import { MagnetModule } from '@magnet-cms/core'
import { NodemailerEmailAdapter } from '@magnet-cms/email-nodemailer'
import { ContentBuilderPlugin } from '@magnet-cms/plugin-content-builder'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CatsModule } from './modules/cats/cats.module'
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module'
import { OwnersModule } from './modules/owners/owners.module'
import { PostsModule } from './modules/posts/posts.module'
import { VeterinariansModule } from './modules/veterinarians/veterinarians.module'

/**
 * Example application using Magnet CMS with MySQL (Drizzle ORM).
 *
 * This demonstrates:
 * - Drizzle ORM adapter with mysql2 driver (local Docker MySQL)
 * - JWT authentication (built-in)
 * - S3 storage via MinIO (S3-compatible)
 * - DB vault for secrets management (default)
 * - Nodemailer email adapter (MailPit for dev)
 * - Content Builder plugin
 * - Admin UI serving
 *
 * To run this example:
 * 1. Copy .env.example to .env
 * 2. Run: bun run docker:up
 * 3. Run: bun run dev
 */
@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		MagnetModule.forRoot(
			[
				DrizzleDatabaseAdapter.forRoot({
					dialect: 'mysql',
					driver: 'mysql2',
					debug: process.env.NODE_ENV === 'development',
				}),
				S3StorageAdapter.forRoot({
					forcePathStyle: true,
				}),
				NodemailerEmailAdapter.forRoot({
					secure: false,
					auth: { user: '', pass: '' },
					defaults: { from: process.env.EMAIL_FROM || 'noreply@magnet.local' },
				}),
				ContentBuilderPlugin.forRoot(),
			],
			{ admin: true },
		),
		CatsModule,
		OwnersModule,
		VeterinariansModule,
		MedicalRecordsModule,
		PostsModule,
	],
})
export class AppModule {}
