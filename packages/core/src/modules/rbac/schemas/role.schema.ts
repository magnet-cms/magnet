import { Field, Schema } from '@magnet-cms/common'
import {
	ArrayUnique,
	IsArray,
	IsBoolean,
	IsDate,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	MinLength,
} from 'class-validator'

/**
 * Role schema for storing user roles and their permissions.
 *
 * Roles contain:
 * - A unique name (slug) for programmatic access
 * - A display name for UI
 * - An array of permission IDs
 * - System flag for protecting default roles
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class Role {
	/**
	 * Unique role identifier (slug)
	 * Used for programmatic access (e.g., 'admin', 'editor', 'authenticated')
	 */
	@Field.Text({ required: true, unique: true, tab: 'General' })
	@Field.Validators(
		IsString(),
		IsNotEmpty(),
		MinLength(2),
		MaxLength(50),
		Matches(/^[a-z][a-z0-9-]*$/, {
			message:
				'Role name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens',
		}),
	)
	name!: string

	/**
	 * Human-readable display name
	 */
	@Field.Text({ required: true, tab: 'General' })
	@Field.Validators(IsString(), IsNotEmpty(), MinLength(2), MaxLength(100))
	displayName!: string

	/**
	 * Role description for admin UI
	 */
	@Field.Textarea({ tab: 'General' })
	@Field.Validators(IsString(), IsOptional(), MaxLength(500))
	description?: string

	/**
	 * Array of permission IDs assigned to this role
	 * Use '*' for wildcard (all permissions)
	 * Use 'content.*' for category wildcard
	 */
	@Field.JSON({ default: [] })
	@Field.Validators(IsArray(), ArrayUnique(), IsString({ each: true }))
	permissions: string[] = []

	/**
	 * Whether this is a system role (cannot be deleted)
	 * System roles: admin, authenticated, public
	 */
	@Field.Boolean({ default: false, tab: 'Settings' })
	@Field.Validators(IsBoolean())
	isSystem = false

	/**
	 * User count (computed, not stored)
	 * Populated when listing roles
	 */
	userCount?: number

	/**
	 * When this role was created
	 */
	@Field.DateTime({ default: () => new Date() })
	@Field.Validators(IsDate())
	createdAt: Date = new Date()

	/**
	 * When this role was last updated
	 */
	@Field.DateTime({})
	@Field.Validators(IsDate(), IsOptional())
	updatedAt?: Date
}
