import { Field, Schema } from '@magnet-cms/common'
import {
	IsBoolean,
	IsDate,
	IsIn,
	IsNotEmpty,
	IsOptional,
	IsString,
} from 'class-validator'

/**
 * Failure reason types for login attempts
 */
export type LoginFailureReason =
	| 'invalid_password'
	| 'user_not_found'
	| 'account_locked'
	| 'email_not_verified'

/**
 * Login attempt schema for tracking authentication attempts.
 *
 * Used for:
 * - Account lockout logic
 * - Security monitoring
 * - Audit logging
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class LoginAttempt {
	/**
	 * Email address used in the attempt
	 */
	@Field.Email({ required: true })
	@Field.Validators(IsString(), IsNotEmpty())
	email!: string

	/**
	 * Whether the login was successful
	 */
	@Field.Boolean({ required: true })
	@Field.Validators(IsBoolean())
	success!: boolean

	/**
	 * Reason for failure (if unsuccessful)
	 */
	@Field.Select({
		options: [
			{ label: 'Invalid Password', value: 'invalid_password' },
			{ label: 'User Not Found', value: 'user_not_found' },
			{ label: 'Account Locked', value: 'account_locked' },
			{ label: 'Email Not Verified', value: 'email_not_verified' },
		],
	})
	@Field.Validators(
		IsString(),
		IsIn([
			'invalid_password',
			'user_not_found',
			'account_locked',
			'email_not_verified',
		]),
		IsOptional(),
	)
	failureReason?: LoginFailureReason

	/**
	 * IP address of the client
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	ipAddress?: string

	/**
	 * User-Agent header
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	userAgent?: string

	/**
	 * Timestamp of the attempt
	 */
	@Field.DateTime({ default: () => new Date() })
	@Field.Validators(IsDate())
	timestamp: Date = new Date()
}
