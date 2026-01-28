import {
	type CategorizedPermissions,
	InjectModel,
	Model,
	RoleNotFoundError,
	type RoleWithPermissions,
	type SystemRoleConfig,
} from '@magnet-cms/common'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { EventService } from '../../events/event.service'
import { UserService } from '../../user/user.service'
import { CreateRoleDto } from '../dto/create-role.dto'
import { DuplicateRoleDto } from '../dto/duplicate-role.dto'
import { UpdateRoleDto } from '../dto/update-role.dto'
import { DEFAULT_ROLES, WILDCARD_PERMISSION } from '../rbac.constants'
import { Role } from '../schemas/role.schema'
import { PermissionDiscoveryService } from './permission-discovery.service'

/**
 * Default system roles configuration
 */
const SYSTEM_ROLES: SystemRoleConfig[] = [
	{
		name: 'admin',
		displayName: 'Admin',
		description: 'Full access to all features and settings.',
		permissions: [WILDCARD_PERMISSION],
	},
	{
		name: 'authenticated',
		displayName: 'Authenticated',
		description: 'Default role for authenticated users.',
		permissions: [],
	},
	{
		name: 'public',
		displayName: 'Public',
		description: 'Default role for unauthenticated requests.',
		permissions: [],
	},
]

/**
 * Service for managing roles and checking permissions
 */
@Injectable()
export class RoleService implements OnModuleInit {
	private readonly logger = new Logger(RoleService.name)
	private permissionCache = new Map<string, Map<string, boolean>>()
	private cacheEnabled = true
	private cacheTTL = 300000 // 5 minutes

	constructor(
		@InjectModel(Role) private readonly roleModel: Model<Role>,
		private readonly permissionDiscovery: PermissionDiscoveryService,
		private readonly eventService: EventService,
		private readonly userService: UserService,
	) {}

	async onModuleInit(): Promise<void> {
		await this.ensureDefaultRoles()
	}

	/**
	 * Ensure default system roles exist
	 */
	private async ensureDefaultRoles(): Promise<void> {
		for (const roleConfig of SYSTEM_ROLES) {
			const existing = await this.roleModel.findOne({ name: roleConfig.name })
			if (!existing) {
				await this.roleModel.create({
					name: roleConfig.name,
					displayName: roleConfig.displayName,
					description: roleConfig.description,
					permissions: roleConfig.permissions,
					isSystem: true,
					createdAt: new Date(),
				})
				this.logger.log(`Created default role: ${roleConfig.name}`)
			}
		}
	}

	// =========================================================================
	// CRUD Operations
	// =========================================================================

	/**
	 * Get all roles
	 */
	async findAll(): Promise<Role[]> {
		const roles = await this.roleModel.find()
		return roles
	}

	/**
	 * Get all roles with user counts
	 */
	async findAllWithCounts(): Promise<(Role & { userCount: number })[]> {
		const roles = await this.roleModel.find()
		const users = await this.userService.findAll()

		return roles.map((role) => ({
			...role,
			userCount: users.filter((u) => u.role === role.name).length,
		}))
	}

	/**
	 * Get a role by ID
	 */
	async findById(id: string): Promise<Role | null> {
		return this.roleModel.findOne({ id })
	}

	/**
	 * Get a role by name
	 */
	async findByName(name: string): Promise<Role | null> {
		return this.roleModel.findOne({ name })
	}

	/**
	 * Get a role with all permissions resolved
	 */
	async findByIdWithPermissions(id: string): Promise<RoleWithPermissions> {
		const role = await this.findById(id)
		if (!role) {
			throw new RoleNotFoundError(id)
		}

		return this.resolveRolePermissions(role)
	}

	/**
	 * Get a role by name with all permissions resolved
	 */
	async findByNameWithPermissions(name: string): Promise<RoleWithPermissions> {
		const role = await this.findByName(name)
		if (!role) {
			throw new RoleNotFoundError(name)
		}

		return this.resolveRolePermissions(role)
	}

	/**
	 * Create a new role
	 */
	async create(dto: CreateRoleDto): Promise<Role> {
		const role = await this.roleModel.create({
			name: dto.name,
			displayName: dto.displayName,
			description: dto.description,
			permissions: dto.permissions ?? [],
			isSystem: false,
			createdAt: new Date(),
		})

		await this.eventService.emit('role.created', {
			roleId: this.getRoleId(role),
			roleName: role.name,
		})

		this.logger.log(`Created role: ${role.name}`)
		return role
	}

	/**
	 * Update a role
	 */
	async update(id: string, dto: UpdateRoleDto): Promise<Role> {
		const existing = await this.findById(id)
		if (!existing) {
			throw new RoleNotFoundError(id)
		}

		await this.roleModel.update(
			{ id },
			{
				...(dto.displayName && { displayName: dto.displayName }),
				...(dto.description !== undefined && { description: dto.description }),
				updatedAt: new Date(),
			},
		)

		const updated = await this.findById(id)
		if (!updated) {
			throw new RoleNotFoundError(id)
		}

		await this.eventService.emit('role.updated', {
			roleId: id,
			roleName: updated.name,
		})

		this.invalidateRoleCache(updated.name)
		this.logger.log(`Updated role: ${updated.name}`)

		return updated
	}

	/**
	 * Update role permissions
	 */
	async updatePermissions(id: string, permissions: string[]): Promise<Role> {
		const existing = await this.findById(id)
		if (!existing) {
			throw new RoleNotFoundError(id)
		}

		await this.roleModel.update(
			{ id },
			{
				permissions,
				updatedAt: new Date(),
			},
		)

		const updated = await this.findById(id)
		if (!updated) {
			throw new RoleNotFoundError(id)
		}

		await this.eventService.emit('role.permissions_updated', {
			roleId: id,
			roleName: updated.name,
			permissions,
		})

		this.invalidateRoleCache(updated.name)
		this.logger.log(`Updated permissions for role: ${updated.name}`)

		return updated
	}

	/**
	 * Delete a role (non-system roles only)
	 */
	async delete(id: string): Promise<void> {
		const existing = await this.findById(id)
		if (!existing) {
			throw new RoleNotFoundError(id)
		}

		if (existing.isSystem) {
			throw new Error('Cannot delete system roles')
		}

		// Check if any users have this role
		const users = await this.userService.findAll()
		const usersWithRole = users.filter((u) => u.role === existing.name)
		if (usersWithRole.length > 0) {
			throw new Error(
				`Cannot delete role "${existing.name}": ${usersWithRole.length} user(s) have this role assigned`,
			)
		}

		await this.roleModel.delete({ id })

		await this.eventService.emit('role.deleted', {
			roleId: id,
			roleName: existing.name,
		})

		this.invalidateRoleCache(existing.name)
		this.logger.log(`Deleted role: ${existing.name}`)
	}

	/**
	 * Duplicate a role
	 */
	async duplicate(id: string, dto: DuplicateRoleDto): Promise<Role> {
		const source = await this.findById(id)
		if (!source) {
			throw new RoleNotFoundError(id)
		}

		// Check if target name already exists
		const existingWithName = await this.findByName(dto.name)
		if (existingWithName) {
			throw new Error(`Role with name "${dto.name}" already exists`)
		}

		const newRole = await this.roleModel.create({
			name: dto.name,
			displayName: dto.displayName ?? `Copy of ${source.displayName}`,
			description: source.description,
			permissions: [...source.permissions],
			isSystem: false,
			createdAt: new Date(),
		})

		await this.eventService.emit('role.created', {
			roleId: this.getRoleId(newRole),
			roleName: newRole.name,
		})

		this.logger.log(`Duplicated role ${source.name} to ${newRole.name}`)
		return newRole
	}

	// =========================================================================
	// Permission Checking
	// =========================================================================

	/**
	 * Check if a user has a specific permission
	 */
	async hasPermission(userId: string, permission: string): Promise<boolean> {
		const user = await this.userService.findOneById(userId)
		if (!user?.role) return false

		return this.roleHasPermission(user.role, permission)
	}

	/**
	 * Check if a role has a specific permission
	 */
	async roleHasPermission(
		roleName: string,
		permission: string,
	): Promise<boolean> {
		// Check cache first
		if (this.cacheEnabled) {
			const cached = this.getCachedPermission(roleName, permission)
			if (cached !== undefined) return cached
		}

		const role = await this.findByName(roleName)
		if (!role) return false

		const hasPermission = this.checkPermission(role.permissions, permission)

		// Cache the result
		if (this.cacheEnabled) {
			this.setCachedPermission(roleName, permission, hasPermission)
		}

		return hasPermission
	}

	/**
	 * Check if a permission list includes a permission (with wildcard support)
	 */
	checkPermission(rolePermissions: string[], permissionId: string): boolean {
		// Global wildcard
		if (rolePermissions.includes(WILDCARD_PERMISSION)) return true

		// Exact match
		if (rolePermissions.includes(permissionId)) return true

		// Check wildcards (e.g., 'content.*' matches 'content.posts.create')
		const parts = permissionId.split('.')
		for (let i = parts.length - 1; i > 0; i--) {
			const wildcard = [...parts.slice(0, i), '*'].join('.')
			if (rolePermissions.includes(wildcard)) return true
		}

		return false
	}

	/**
	 * Get all permissions a user has
	 */
	async getUserPermissions(userId: string): Promise<string[]> {
		const user = await this.userService.findOneById(userId)
		if (!user?.role) return []

		const role = await this.findByName(user.role)
		if (!role) return []

		// If admin (has wildcard), return all discovered permissions
		if (role.permissions.includes(WILDCARD_PERMISSION)) {
			return this.permissionDiscovery.getAll().map((p) => p.id)
		}

		return role.permissions
	}

	/**
	 * Assign a role to a user
	 */
	async assignRoleToUser(userId: string, roleName: string): Promise<void> {
		const role = await this.findByName(roleName)
		if (!role) {
			throw new RoleNotFoundError(roleName)
		}

		await this.userService.update(userId, { role: roleName })

		await this.eventService.emit('role.user_assigned', {
			roleId: this.getRoleId(role),
			roleName: role.name,
			assignedUserId: userId,
		})

		this.logger.log(`Assigned role "${roleName}" to user ${userId}`)
	}

	// =========================================================================
	// Permission Discovery Integration
	// =========================================================================

	/**
	 * Get all discovered permissions
	 */
	getAllPermissions(): CategorizedPermissions {
		return this.permissionDiscovery.getCategorized()
	}

	// =========================================================================
	// Cache Management
	// =========================================================================

	/**
	 * Enable or disable permission caching
	 */
	setCacheEnabled(enabled: boolean): void {
		this.cacheEnabled = enabled
		if (!enabled) {
			this.clearCache()
		}
	}

	/**
	 * Set cache TTL
	 */
	setCacheTTL(ttlMs: number): void {
		this.cacheTTL = ttlMs
	}

	/**
	 * Clear the permission cache
	 */
	clearCache(): void {
		this.permissionCache.clear()
		this.logger.debug('Permission cache cleared')
	}

	/**
	 * Invalidate cache for a specific role
	 */
	private invalidateRoleCache(roleName: string): void {
		this.permissionCache.delete(roleName)
	}

	private getCachedPermission(
		roleName: string,
		permission: string,
	): boolean | undefined {
		const roleCache = this.permissionCache.get(roleName)
		return roleCache?.get(permission)
	}

	private setCachedPermission(
		roleName: string,
		permission: string,
		value: boolean,
	): void {
		let roleCache = this.permissionCache.get(roleName)
		if (!roleCache) {
			roleCache = new Map()
			this.permissionCache.set(roleName, roleCache)
		}
		roleCache.set(permission, value)

		// Set up TTL cleanup
		setTimeout(() => {
			roleCache?.delete(permission)
		}, this.cacheTTL)
	}

	// =========================================================================
	// Helper Methods
	// =========================================================================

	/**
	 * Resolve a role with all permissions marked
	 */
	private resolveRolePermissions(role: Role): RoleWithPermissions {
		const categorized = this.permissionDiscovery.getCategorized()

		return {
			id: this.getRoleId(role),
			name: role.name,
			displayName: role.displayName,
			description: role.description,
			permissions: role.permissions,
			isSystem: role.isSystem,
			createdAt: role.createdAt,
			updatedAt: role.updatedAt,
			collectionTypes: this.permissionDiscovery.markPermissions(
				categorized.collectionTypes,
				role.permissions,
			),
			plugins: this.permissionDiscovery.markPermissions(
				categorized.plugins,
				role.permissions,
			),
			system: this.permissionDiscovery.markPermissions(
				categorized.system,
				role.permissions,
			),
		}
	}

	/**
	 * Get role ID (handles both string ID and _id from MongoDB)
	 */
	private getRoleId(role: Role): string {
		// Handle both string id and MongoDB ObjectId
		const roleRecord = role as Role & {
			_id?: { toString: () => string }
			id?: string
		}
		if (roleRecord.id) return roleRecord.id
		if (roleRecord._id) return roleRecord._id.toString()
		return role.name // Fallback to name
	}

	/**
	 * Check if a role name is a system role
	 */
	isSystemRole(roleName: string): boolean {
		return Object.values(DEFAULT_ROLES).includes(
			roleName as (typeof DEFAULT_ROLES)[keyof typeof DEFAULT_ROLES],
		)
	}
}
