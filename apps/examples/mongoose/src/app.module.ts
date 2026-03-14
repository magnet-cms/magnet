import { MagnetModule } from '@magnet-cms/core'
import { ContentBuilderPlugin } from '@magnet-cms/plugin-content-builder'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CatsModule } from './modules/cats/cats.module'
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module'
import { OwnersModule } from './modules/owners/owners.module'
import { VeterinariansModule } from './modules/veterinarians/veterinarians.module'

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
			// Vault is now a core module — always enabled with the built-in DB adapter.
			// Set VAULT_MASTER_KEY env var to enable encrypted secret storage.
			vault: { adapter: 'db' },
			plugins: [{ plugin: ContentBuilderPlugin }],
		}),
		CatsModule,
		OwnersModule,
		VeterinariansModule,
		MedicalRecordsModule,
	],
})
export class AppModule {}
