import { Field, Schema } from '@magnet-cms/common'
import { IsBoolean, IsDate, IsNotEmpty, IsString } from 'class-validator'

/**
 * Password reset schema for storing reset token requests.
 *
 * Tokens are hashed before storage for security.
 * Each token can only be used once.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class PasswordReset {
	/**
	 * User ID requesting the reset
	 */
	@Field.Text({ required: true })
	@Field.Validators(IsString(), IsNotEmpty())
	userId!: string

	/**
	 * Hashed reset token
	 */
	@Field.Text({ required: true, unique: true })
	@Field.Validators(IsString(), IsNotEmpty())
	tokenHash!: string

	/**
	 * When this reset token expires
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
