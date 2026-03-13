import { isUserExtension } from '@magnet-cms/common'
import { DynamicModule, Logger, Module, Type } from '@nestjs/common'
import { DatabaseModule } from '~/modules/database'
import { User } from './schemas/user.schema'
import {
	USER_EXTENSION_TOKEN,
	UserExtensionService,
} from './user-extension.service'
import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
	imports: [DatabaseModule.forFeature(User)],
	controllers: [UserController],
	providers: [UserService, UserExtensionService],
	exports: [UserService, UserExtensionService],
})
export class UserModule {
	private static readonly logger = new Logger(UserModule.name)

	/**
	 * Register a custom User schema or extension.
	 *
	 * If the provided class is decorated with @ExtendUser(), it will be
	 * merged with the base User schema. Otherwise, it will be used as-is.
	 *
	 * @example
	 * ```typescript
	 * // With @ExtendUser() decorator - merges with base User
	 * @ExtendUser()
	 * export class User {
	 *   @Field.Text({ required: true })
	 *   firstName: string
	 * }
	 *
	 * @Module({
	 *   imports: [UserModule.forFeature(User)],
	 * })
	 * export class AppModule {}
	 * ```
	 */
	static forFeature(customSchema?: Type): DynamicModule {
		const schema = customSchema ?? User

		// Check if it's a user extension
		if (customSchema && isUserExtension(customSchema)) {
			UserModule.logger.log(`Registering User extension: ${customSchema.name}`)

			return {
				module: UserModule,
				imports: [DatabaseModule.forFeature(schema)],
				controllers: [UserController],
				providers: [
					{
						provide: USER_EXTENSION_TOKEN,
						useValue: customSchema,
					},
					UserExtensionService,
					UserService,
				],
				exports: [UserService, UserExtensionService],
			}
		}

		// Use as regular schema
		return {
			module: UserModule,
			imports: [DatabaseModule.forFeature(schema)],
			controllers: [UserController],
			providers: [UserService, UserExtensionService],
			exports: [UserService, UserExtensionService],
		}
	}
}
