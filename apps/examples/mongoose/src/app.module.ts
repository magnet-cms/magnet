import { MagnetModule } from '@magnet-cms/core'
import { ContentBuilderPlugin } from '@magnet-cms/plugin-content-builder'
import { StripePlugin } from '@magnet-cms/plugin-stripe'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CatsModule } from './modules/cats/cats.module'
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module'
import { OwnersModule } from './modules/owners/owners.module'
import { VeterinariansModule } from './modules/veterinarians/veterinarians.module'

/**
 * Example application using Magnet CMS with MongoDB (Mongoose).
 *
 * This demonstrates:
 * - Mongoose database adapter
 * - JWT authentication (built-in)
 * - Local file storage
 * - HashiCorp Vault for secrets management
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
		MagnetModule.forRoot({
			db: {
				uri:
					process.env.MONGODB_URI || 'mongodb://localhost:27017/cats-example',
			},
			jwt: {
				secret: process.env.JWT_SECRET || 'development-secret-key',
			},
			admin: true,
			storage: {
				adapter: 'local',
				local: {
					uploadDir: './uploads',
					publicPath: '/media',
				},
			},
			vault: {
				adapter: 'hashicorp',
				hashicorp: {
					url: process.env.VAULT_ADDR || 'http://localhost:8200',
				},
			},
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
			plugins: [
				{ plugin: ContentBuilderPlugin },
				{
					plugin: StripePlugin,
					options: {
						secretKey: process.env.STRIPE_SECRET_KEY || '',
						webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
						publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
						currency: 'usd',
						features: {
							pro: ['unlimited-servers', 'priority-support'],
							basic: ['5-servers'],
						},
					},
				},
			],
		}),
		CatsModule,
		OwnersModule,
		VeterinariansModule,
		MedicalRecordsModule,
	],
})
export class AppModule {}
