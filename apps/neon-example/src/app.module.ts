import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PostsModule } from './modules/posts/posts.module'

/**
 * Example application using Magnet CMS with Neon PostgreSQL.
 *
 * This demonstrates:
 * - Drizzle ORM adapter with Neon serverless driver
 * - Schema definition using @Schema and @Prop decorators
 * - Content types with i18n and versioning support
 *
 * To run this example:
 * 1. Create a Neon database at https://neon.tech
 * 2. Copy .env.example to .env and add your DATABASE_URL
 * 3. Run: bun run dev
 */
@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		MagnetModule.forRoot({
			db: {
				connectionString: process.env.DATABASE_URL || '',
				dialect: 'postgresql',
				driver: 'neon',
				debug: process.env.NODE_ENV === 'development',
			},
			jwt: {
				secret: process.env.JWT_SECRET || 'development-secret-key',
			},
		}),
		PostsModule,
	],
})
export class AppModule {}
