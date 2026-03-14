import { Field, Schema } from '@magnet-cms/common'
import { IsBoolean, IsDate, IsNotEmpty, IsString } from 'class-validator'

/**
 * Email verification schema for storing verification tokens.
 *
 * Follows the same pattern as PasswordReset schema.
 * Tokens are hashed before storage for security.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class EmailVerification {
	/**
	 * User ID to verify
	 */
	@Field.Text({ required: true })
	@Field.Validators(IsString(), IsNotEmpty())
	userId!: string

	/**
	 * Email address to verify
	 */
	@Field.Email({ required: true })
	@Field.Validators(IsString(), IsNotEmpty())
	email!: string

	/**
	 * Hashed verification token
	 */
	@Field.Text({ required: true, unique: true })
	@Field.Validators(IsString(), IsNotEmpty())
	tokenHash!: string

	/**
	 * When this verification token expires
	 */
	@Field.DateTime({ required: true })
	@Field.Validators(IsDate())
	expiresAt!: Date

	/**
	 * Whether this token has been used
	 */
	@Field.Boolean({ default: false })
	@Field.Validators(IsBoolean())
	used = false

	/**
	 * When this request was created
	 */
	@Field.DateTime({ default: () => new Date() })
	@Field.Validators(IsDate())
	createdAt: Date = new Date()
}
