// IMPORTANT: Set database adapter FIRST, before any schema imports
import { setDatabaseAdapter } from '@magnet-cms/common'
setDatabaseAdapter('drizzle')

import { MagnetModule } from '@magnet-cms/core'
import { ContentBuilderPlugin } from '@magnet-cms/plugin-content-builder'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CatsModule } from './modules/cats/cats.module'
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module'
import { OwnersModule } from './modules/owners/owners.module'
import { PostsModule } from './modules/posts/posts.module'
import { VeterinariansModule } from './modules/veterinarians/veterinarians.module'

/**
 * Example application using Magnet CMS with SQLite (Drizzle ORM).
 *
 * This demonstrates:
 * - Drizzle ORM adapter with better-sqlite3 and file-based SQLite
 * - JWT authentication (built-in)
 * - S3 storage via MinIO (S3-compatible)
 * - DB vault for secrets management
 * - Nodemailer email adapter (MailPit for dev)
 * - Content Builder plugin
 * - Admin UI serving
 *
 * To run this example:
 * 1. Copy .env.example to .env
 * 2. Run: bun run docker:up (for MinIO and Mailpit)
 * 3. Run: bun run dev
 */
@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		MagnetModule.forRoot({
			db: {
				connectionString: process.env.DATABASE_URL || './sqlite.db',
				dialect: 'sqlite',
				driver: 'better-sqlite3',
				debug: process.env.NODE_ENV === 'development',
			},
			jwt: {
				secret: process.env.JWT_SECRET || 'development-secret-key',
			},
			admin: true,
			storage: {
				adapter: 's3',
				s3: {
					bucket: process.env.S3_BUCKET || 'magnet-media',
					region: process.env.S3_REGION || 'us-east-1',
					accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
					secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
					endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
					forcePathStyle: true,
				},
			},
			vault: { adapter: 'db' },
			email: {
				adapter: 'nodemailer',
				nodemailer: {
					host: process.env.SMTP_HOST || 'localhost',
					port: Number(process.env.SMTP_PORT || 1025),
					secure: false,
					auth: { user: '', pass: '' },
				},
				defaults: {
					from: process.env.EMAIL_FROM || 'noreply@magnet.local',
				},
			},
			plugins: [{ plugin: ContentBuilderPlugin }],
		}),
		CatsModule,
		OwnersModule,
		VeterinariansModule,
		MedicalRecordsModule,
		PostsModule,
	],
})
export class AppModule {}
