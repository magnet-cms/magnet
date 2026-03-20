import { DrizzleDatabaseAdapter } from '@magnet-cms/adapter-db-drizzle'
import { S3StorageAdapter } from '@magnet-cms/adapter-storage-s3'
import { MagnetModule } from '@magnet-cms/core'
import { NodemailerEmailAdapter } from '@magnet-cms/email-nodemailer'
import { PlaygroundPlugin } from '@magnet-cms/plugin-playground'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FeaturesModule } from './modules/features.module'

/**
 * Example application using Magnet CMS with PostgreSQL (Drizzle ORM).
 *
 * This demonstrates:
 * - Drizzle ORM adapter with pg driver (local Docker PostgreSQL)
 * - JWT authentication (built-in)
 * - S3 storage via MinIO (S3-compatible)
 * - DB vault for secrets management (default)
 * - Nodemailer email adapter (MailPit for dev)
 * - Playground plugin
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
		FeaturesModule.forRoot(
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
					S3StorageAdapter.forRoot({
						forcePathStyle: true,
					}),
					NodemailerEmailAdapter.forRoot({
						secure: false,
						auth: { user: '', pass: '' },
						defaults: {
							from: process.env.EMAIL_FROM || 'noreply@magnet.local',
						},
					}),
					PlaygroundPlugin.forRoot(),
				],
				{ admin: true },
			),
		),
	],
})
export class AppModule {}
