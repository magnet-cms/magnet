/**
 * Role-Based Access Control (RBAC) Type Definitions
 *
 * Type-safe permission and role management system.
 * Used by: Permission guards, Role service, Admin UI permission matrix
 */

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Permission source - where the permission was discovered from
 */
export type PermissionSource = 'schema' | 'controller' | 'plugin' | 'manual'

/**
 * Permission definition - represents a single permission in the system
 */
export interface PermissionDefinition {
	/** Unique permission identifier (e.g., 'content.posts.create') */
	id: string
	/** Human-readable name */
	name: string
	/** Description for admin UI */
	description?: string
	/** Group for organization (e.g., 'Content', 'Users', 'Settings') */
	group?: string
	/** Schema name if auto-generated from schema */
	schema?: string
	/** API identifier (e.g., 'api::posts', 'plugin::content-builder') */
	apiId?: string
	/** Source of this permission */
	source?: PermissionSource
	/** Controller name if discovered from controller */
	controller?: string
	/** Method name if discovered from controller */
	method?: string
	/** Plugin name if from plugin */
	plugin?: string
}

/**
 * Permission item with checked state (for UI)
 */
export interface PermissionItem {
	/** Permission identifier */
	id: string
	/** Human-readable name */
	name: string
	/** Description */
	description: string
	/** Whether this permission is enabled */
	checked?: boolean
}

/**
 * Permission group for UI display
 */
export interface PermissionGroup {
	/** Group identifier */
	id: string
	/** Display name */
	name: string
	/** API identifier */
	apiId?: string
	/** Permissions in this group */
	permissions: PermissionItem[]
}

/**
 * Permissions categorized by type
 */
export interface CategorizedPermissions {
	/** Permissions for collection types (schemas) */
	collectionTypes: PermissionGroup[]
	/** Permissions from plugins */
	plugins: PermissionGroup[]
	/** System permissions (users, settings, etc.) */
	system: PermissionGroup[]
}

// ============================================================================
// Role Types
// ============================================================================

/**
 * Role definition
 */
export interface Role {
	/** Unique role identifier */
	id: string
	/** Role slug (e.g., 'admin', 'authenticated', 'editor') */
	name: string
	/** Human-readable name */
	displayName: string
	/** Role description */
	description?: string
	/** Array of permission IDs */
	permissions: string[]
	/** Whether this is a system role (cannot be deleted) */
	isSystem: boolean
	/** When the role was created */
	createdAt: Date
	/** When the role was last updated */
	updatedAt?: Date
}

/**
 * Role with resolved permission details for UI
 */
export interface RoleWithPermissions extends Role {
	/** Collection type permissions */
	collectionTypes: PermissionGroup[]
	/** Plugin permissions */
	plugins: PermissionGroup[]
	/** System permissions */
	system: PermissionGroup[]
}

/**
 * Default system role names
 */
export type SystemRoleName = 'admin' | 'authenticated' | 'public'

/**
 * System role configuration
 */
export interface SystemRoleConfig {
	name: SystemRoleName
	displayName: string
	description: string
	permissions: string[]
}

// ============================================================================
// Permission Decorator Types
// ============================================================================

/**
 * Options for @RequirePermission decorator
 */
export interface PermissionOptions {
	/** Permission identifier (e.g., 'content.posts.create') */
	id: string
	/** Human-readable name */
	name: string
	/** Description for admin UI */
	description?: string
	/** Group for organization */
	group?: string
}

/**
 * Resolved permission after template substitution
 */
export interface ResolvedPermission extends PermissionOptions {
	/** Original template (if any) */
	template?: string
}

// ============================================================================
// DTO Types
// ============================================================================

/**
 * Create role request
 */
export interface CreateRoleDto {
	/** Role slug (lowercase, no spaces) */
	name: string
	/** Human-readable name */
	displayName: string
	/** Role description */
	description?: string
	/** Initial permissions */
	permissions?: string[]
}

/**
 * Update role request
 */
export interface UpdateRoleDto {
	/** Human-readable name */
	displayName?: string
	/** Role description */
	description?: string
}

/**
 * Update role permissions request
 */
export interface UpdatePermissionsDto {
	/** Array of permission IDs to set */
	permissions: string[]
}

/**
 * Duplicate role request
 */
export interface DuplicateRoleDto {
	/** Name for the new role */
	name: string
	/** Display name for the new role */
	displayName?: string
}

/**
 * Assign role to user request
 */
export interface AssignRoleDto {
	/** Role name to assign */
	roleName: string
}

// ============================================================================
// Service Types
// ============================================================================

/**
 * Permission check result
 */
export interface PermissionCheckResult {
	/** Whether permission is granted */
	granted: boolean
	/** The permission that was checked */
	permission: string
	/** User's role name */
	role?: string
	/** Reason if denied */
	reason?: string
}

/**
 * Role audit log entry
 */
export interface RoleAuditEntry {
	/** Action performed */
	action:
		| 'created'
		| 'updated'
		| 'permissions_updated'
		| 'deleted'
		| 'duplicated'
	/** When the action occurred */
	timestamp: Date
	/** User who performed the action */
	userId?: string
	/** User name for display */
	userName?: string
	/** Changed permissions (for permissions_updated) */
	permissions?: {
		added: string[]
		removed: string[]
	}
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * RBAC module options
 */
export interface RBACModuleOptions {
	/** Whether RBAC is enabled */
	enabled?: boolean
	/** Default role for new users */
	defaultRole?: string
	/** Whether to allow public (unauthenticated) access */
	allowPublicAccess?: boolean
	/** Whether to cache permission checks */
	cachePermissions?: boolean
	/** Cache TTL in seconds */
	cacheTTL?: number
}
