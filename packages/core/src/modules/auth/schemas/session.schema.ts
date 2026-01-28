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
 * Device type enum for session tracking
 */
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown'

/**
 * Session schema for tracking active user sessions.
 *
 * Sessions are linked to refresh tokens and provide:
 * - Device/browser information
 * - Location tracking (from IP)
 * - Activity timestamps
 * - Session management (view/revoke)
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class Session {
	/**
	 * User ID this session belongs to
	 */
	@Field.Text({ required: true })
	@Field.Validators(IsString(), IsNotEmpty())
	userId!: string

	/**
	 * Unique session identifier (UUID)
	 */
	@Field.Text({ required: true, unique: true })
	@Field.Validators(IsString(), IsNotEmpty())
	sessionId!: string

	/**
	 * Associated refresh token ID
	 */
	@Field.Text({ required: true })
	@Field.Validators(IsString(), IsNotEmpty())
	refreshTokenId!: string

	/**
	 * Human-readable device name
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	deviceName?: string

	/**
	 * Type of device
	 */
	@Field.Select({
		options: [
			{ label: 'Desktop', value: 'desktop' },
			{ label: 'Mobile', value: 'mobile' },
			{ label: 'Tablet', value: 'tablet' },
			{ label: 'Unknown', value: 'unknown' },
		],
		default: 'unknown',
	})
	@Field.Validators(
		IsString(),
		IsIn(['desktop', 'mobile', 'tablet', 'unknown']),
		IsOptional(),
	)
	deviceType?: DeviceType

	/**
	 * Browser name
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	browser?: string

	/**
	 * Operating system
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	os?: string

	/**
	 * IP address of the client
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	ipAddress?: string

	/**
	 * Geographic location derived from IP
	 */
	@Field.Text({})
	@Field.Validators(IsString(), IsOptional())
	location?: string

	/**
	 * Whether this session is active
	 */
	@Field.Boolean({ default: true })
	@Field.Validators(IsBoolean())
	active = true

	/**
	 * When this session was created
	 */
	@Field.DateTime({ default: () => new Date() })
	@Field.Validators(IsDate())
	createdAt: Date = new Date()

	/**
	 * Last activity timestamp
	 */
	@Field.DateTime({})
	@Field.Validators(IsDate(), IsOptional())
	lastActivityAt?: Date

	/**
	 * When this session expires
	 */
	@Field.DateTime({ required: true })
	@Field.Validators(IsDate())
	expiresAt!: Date
}
