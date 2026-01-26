import { EXTEND_USER_METADATA_KEY, SCHEMA_METADATA_KEY } from '~/constants'
import { detectDatabaseAdapter } from '~/utils'

/**
 * Options for the @ExtendUser decorator
 */
export interface ExtendUserOptions {
	/**
	 * Whether to include timestamps (createdAt, updatedAt)
	 * @default true
	 */
	timestamps?: boolean
}

/**
 * Marks a class as a User extension.
 *
 * The decorated class will inherit base User fields (id, email, password, role, etc.)
 * and can add additional custom fields using Field decorators.
 *
 * @example
 * ```typescript
 * @ExtendUser()
 * export class User {
 *   // Base fields inherited: id, email, password, role, createdAt, updatedAt
 *
 *   @Field.Text({ required: true })
 *   @Field.Validators(IsString(), Length(1, 50))
 *   firstName: string
 *
 *   @Field.Text({ required: true })
 *   @Field.Validators(IsString(), Length(1, 50))
 *   lastName: string
 *
 *   @Field.Image({ folder: 'avatars' })
 *   avatar?: string
 *
 *   get fullName() {
 *     return `${this.firstName} ${this.lastName}`
 *   }
 * }
 * ```
 */
export function ExtendUser(options: ExtendUserOptions = {}): ClassDecorator {
	const mergedOptions: ExtendUserOptions = {
		timestamps: true,
		...options,
	}

	return (target) => {
		// Mark this class as a User extension
		Reflect.defineMetadata(EXTEND_USER_METADATA_KEY, mergedOptions, target)

		// Also mark it as a schema for discovery
		Reflect.defineMetadata(SCHEMA_METADATA_KEY, true, target)

		// Apply adapter-specific Schema decorator
		try {
			const adapter = detectDatabaseAdapter()
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { Schema } = require(`@magnet-cms/adapter-${adapter}`)
			Schema({ collection: 'users', timestamps: mergedOptions.timestamps })(
				target,
			)
		} catch {
			// Adapter not available, skip adapter-specific decoration
		}
	}
}

/**
 * Check if a class is marked as a User extension
 */
export function isUserExtension(target: Function): boolean {
	return Reflect.hasMetadata(EXTEND_USER_METADATA_KEY, target)
}

/**
 * Get ExtendUser options from a class
 */
export function getExtendUserOptions(
	target: Function,
): ExtendUserOptions | undefined {
	return Reflect.getMetadata(EXTEND_USER_METADATA_KEY, target)
}
