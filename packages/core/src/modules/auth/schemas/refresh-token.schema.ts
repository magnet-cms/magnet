import { Field, Schema } from '@magnet-cms/common'
import {
	IsBoolean,
	IsDate,
	IsNotEmpty,
	IsOptional,
	IsString,
} from 'class-validator'

/**
 * Refresh token schema for token-based authentication.
 *
 * Stores hashed refresh tokens with metadata for:
 * - Token rotation (replacedByToken)
 * - Session tracking (deviceInfo, ipAddress, userAgent)
 * - Revocation management (revoked, revokedAt, revokedReason)
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class RefreshToken {
	/**
	 * Hashed refresh token (never store plain tokens)
	 */
	@Field.Text({ required: true, unique: true })
	@Field.Validators(IsString(), IsNotEmpty())
	token!: string

	/**
	 * User ID this token belongs to
	 */
	@Field.Text({ required: true })
	@Field.Validators(IsString(), IsNotEmpty())
	userId!: string

	/**
	 * When this token expires
	 */
	@Field.DateTime({ required: true })
	@Field.Validators(IsDate())
	expiresAt!: Date

	/**
	 * Whether this token has been revoked
	 */
	@Field.Boolean({ default: false })
	@Field.Validators(IsBoolean())
	revoked = false

	/**
	 * When this token was revoked
	 */
	@Field.DateTime({})
	@Field.Validators(IsDate(), IsOptional())
	revokedAt?: Date

	/**
	 * Reason for revocation
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	revokedReason?: string

	/**
	 * Hash of the token that replaced this one (for rotation tracking)
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	replacedByToken?: string

	/**
	 * Device information from User-Agent parsing
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	deviceInfo?: string

	/**
	 * IP address of the client
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	ipAddress?: string

	/**
	 * Raw User-Agent header
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	userAgent?: string

	/**
	 * When this token was created
	 */
	@Field.DateTime({ default: () => new Date() })
	@Field.Validators(IsDate())
	createdAt: Date = new Date()

	/**
	 * When this token was last used for refresh
	 */
	@Field.DateTime({})
	@Field.Validators(IsDate(), IsOptional())
	lastUsedAt?: Date
}
