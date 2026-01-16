import { MagnetModule } from '@magnet-cms/core'
import { ContentBuilderPlugin } from '@magnet-cms/plugin-content-builder'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CatsModule } from './modules/cats/cats.module'

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
			plugins: [{ plugin: ContentBuilderPlugin }],
		}),
		CatsModule,
	],
})
export class AppModule {}
