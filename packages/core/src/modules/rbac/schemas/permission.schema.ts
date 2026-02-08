import type { PermissionSource } from '@magnet-cms/common'
import { Field, Schema } from '@magnet-cms/common'
import {
	IsDate,
	IsOptional,
	IsString,
	MaxLength,
	MinLength,
} from 'class-validator'

/**
 * Permission schema for persisting discovered permissions.
 *
 * Permissions are auto-registered from:
 * - Schema definitions (CRUD)
 * - Controller methods (@RequirePermission)
 * - Plugins
 * - System definitions
 *
 * Used for validation when assigning permissions to roles.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class Permission {
	/**
	 * Unique permission identifier (e.g., 'content.cat.create', 'roles.find')
	 * This is the key used when assigning permissions to roles.
	 */
	@Field.Text({ required: true, unique: true })
	@Field.Validators(IsString(), MinLength(2), MaxLength(200))
	permissionId!: string

	/**
	 * Human-readable name for the admin UI
	 */
	@Field.Text({ required: true })
	@Field.Validators(IsString(), MinLength(1), MaxLength(200))
	name!: string

	/**
	 * Description for the admin UI
	 */
	@Field.Textarea()
	@Field.Validators(IsString(), IsOptional(), MaxLength(500))
	description?: string

	/**
	 * Group for organization (e.g., 'Content', 'Users', 'Settings')
	 */
	@Field.Text()
	@Field.Validators(IsString(), IsOptional(), MaxLength(100))
	group?: string

	/**
	 * API identifier (e.g., 'api::posts', 'plugin::content-builder', 'system::users')
	 */
	@Field.Text()
	@Field.Validators(IsString(), IsOptional(), MaxLength(100))
	apiId?: string

	/**
	 * Source of this permission
	 */
	@Field.Text()
	@Field.Validators(IsString(), IsOptional())
	source?: PermissionSource

	/**
	 * Controller name if discovered from controller
	 */
	@Field.Text()
	@Field.Validators(IsString(), IsOptional(), MaxLength(200))
	controller?: string

	/**
	 * Method name if discovered from controller
	 */
	@Field.Text()
	@Field.Validators(IsString(), IsOptional(), MaxLength(100))
	method?: string

	/**
	 * Plugin name if from plugin
	 */
	@Field.Text()
	@Field.Validators(IsString(), IsOptional(), MaxLength(100))
	plugin?: string

	/**
	 * Schema name if auto-generated from schema
	 */
	@Field.Text()
	@Field.Validators(IsString(), IsOptional(), MaxLength(100))
	schema?: string

	/**
	 * When this permission was first registered
	 */
	@Field.DateTime({ default: () => new Date() })
	@Field.Validators(IsDate())
	createdAt: Date = new Date()

	/**
	 * When this permission was last updated
	 */
	@Field.DateTime()
	@Field.Validators(IsDate(), IsOptional())
	updatedAt?: Date
}
