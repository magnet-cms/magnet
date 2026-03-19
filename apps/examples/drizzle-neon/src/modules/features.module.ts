import type { DynamicModule } from '@nestjs/common'
import { Module } from '@nestjs/common'

/**
 * Wraps feature modules so they load after MagnetModule.forRoot().
 * Uses require() to defer loading until forRoot() runs (after DatabaseModule.register).
 */
@Module({})
export class FeaturesModule {
	static forRoot(magnetModule: DynamicModule): DynamicModule {
		return {
			module: FeaturesModule,
			imports: [
				magnetModule,
				require('./cats/cats.module').CatsModule,
				require('./owners/owners.module').OwnersModule,
				require('./veterinarians/veterinarians.module').VeterinariansModule,
				require('./medical-records/medical-records.module')
					.MedicalRecordsModule,
				require('./posts/posts.module').PostsModule,
			],
		}
	}
}
