import type {
	AuthUser,
	CategorizedPermissions,
	PermissionDefinition,
	RoleWithPermissions,
} from '@magnet-cms/common'
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Req,
	UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AssignRoleDto } from './dto/assign-role.dto'
import { CreateRoleDto } from './dto/create-role.dto'
import { DuplicateRoleDto } from './dto/duplicate-role.dto'
import { UpdatePermissionsDto } from './dto/update-permissions.dto'
import { UpdateRoleDto } from './dto/update-role.dto'
import { PermissionGuard } from './guards/permission.guard'
import { RequirePermission } from './rbac.decorators'
import { Role } from './schemas/role.schema'
import { PermissionDiscoveryService } from './services/permission-discovery.service'
import { RoleService } from './services/role.service'

/**
 * Authenticated request interface
 */
interface AuthenticatedRequest extends Request {
	user: AuthUser
}

/**
 * Role response with user count
 */
interface RoleListItem extends Role {
	userCount: number
}

/**
 * RBAC Controller
 *
 * Provides endpoints for role and permission management:
 * - GET /api/rbac/roles - List all roles
 * - POST /api/rbac/roles - Create a role
 * - GET /api/rbac/roles/:id - Get role with permissions
 * - PUT /api/rbac/roles/:id - Update role
 * - DELETE /api/rbac/roles/:id - Delete role
 * - POST /api/rbac/roles/:id/duplicate - Duplicate role
 * - PUT /api/rbac/roles/:id/permissions - Update role permissions
 * - GET /api/rbac/permissions - Get all discovered permissions
 * - PUT /api/users/:userId/role - Assign role to user
 */
@Controller('rbac')
@UseGuards(JwtAuthGuard)
export class RBACController {
	constructor(
		private readonly roleService: RoleService,
		private readonly permissionDiscovery: PermissionDiscoveryService,
	) {}

	// =========================================================================
	// Roles
	// =========================================================================

	/**
	 * List all roles with user counts
	 */
	@Get('roles')
	@UseGuards(PermissionGuard)
	@RequirePermission({
		id: 'roles.find',
		name: 'List Roles',
		description: 'View list of roles',
		group: 'Access Control',
	})
	async findAll(): Promise<RoleListItem[]> {
		return this.roleService.findAllWithCounts()
	}

	/**
	 * Get a role with all permissions resolved
	 */
	@Get('roles/:id')
	@UseGuards(PermissionGuard)
	@RequirePermission({
		id: 'roles.findOne',
		name: 'View Role',
		description: 'View role details',
		group: 'Access Control',
	})
	async findOne(@Param('id') id: string): Promise<RoleWithPermissions> {
		return this.roleService.findByIdWithPermissions(id)
	}

	/**
	 * Create a new role
	 */
	@Post('roles')
	@UseGuards(PermissionGuard)
	@RequirePermission({
		id: 'roles.create',
		name: 'Create Role',
		description: 'Create new roles',
		group: 'Access Control',
	})
	async create(@Body() dto: CreateRoleDto): Promise<Role> {
		return this.roleService.create(dto)
	}

	/**
	 * Update a role
	 */
	@Put('roles/:id')
	@UseGuards(PermissionGuard)
	@RequirePermission({
		id: 'roles.update',
		name: 'Update Role',
		description: 'Update role details',
		group: 'Access Control',
	})
	async update(
		@Param('id') id: string,
		@Body() dto: UpdateRoleDto,
	): Promise<Role> {
		return this.roleService.update(id, dto)
	}

	/**
	 * Delete a role
	 */
	@Delete('roles/:id')
	@UseGuards(PermissionGuard)
	@RequirePermission({
		id: 'roles.delete',
		name: 'Delete Role',
		description: 'Delete non-system roles',
		group: 'Access Control',
	})
	async delete(@Param('id') id: string): Promise<{ deleted: boolean }> {
		await this.roleService.delete(id)
		return { deleted: true }
	}

	/**
	 * Duplicate a role
	 */
	@Post('roles/:id/duplicate')
	@UseGuards(PermissionGuard)
	@RequirePermission({
		id: 'roles.create',
		name: 'Duplicate Role',
		description: 'Create a copy of an existing role',
		group: 'Access Control',
	})
	async duplicate(
		@Param('id') id: string,
		@Body() dto: DuplicateRoleDto,
	): Promise<Role> {
		return this.roleService.duplicate(id, dto)
	}

	/**
	 * Update role permissions
	 */
	@Put('roles/:id/permissions')
	@UseGuards(PermissionGuard)
	@RequirePermission({
		id: 'roles.update',
		name: 'Update Permissions',
		description: 'Update role permissions',
		group: 'Access Control',
	})
	async updatePermissions(
		@Param('id') id: string,
		@Body() dto: UpdatePermissionsDto,
	): Promise<Role> {
		return this.roleService.updatePermissions(id, dto.permissions)
	}

	// =========================================================================
	// Permissions
	// =========================================================================

	/**
	 * Get all discovered permissions
	 */
	@Get('permissions')
	@UseGuards(PermissionGuard)
	@RequirePermission({
		id: 'roles.find',
		name: 'List Permissions',
		description: 'View all available permissions',
		group: 'Access Control',
	})
	async getPermissions(): Promise<CategorizedPermissions> {
		return this.permissionDiscovery.getCategorized()
	}

	/**
	 * Get all permissions as a flat list
	 */
	@Get('permissions/all')
	@UseGuards(PermissionGuard)
	@RequirePermission({
		id: 'roles.find',
		name: 'List All Permissions',
		description: 'View all available permissions as a flat list',
		group: 'Access Control',
	})
	async getAllPermissions(): Promise<PermissionDefinition[]> {
		return this.permissionDiscovery.getAll()
	}

	// =========================================================================
	// User Role Assignment
	// =========================================================================

	/**
	 * Assign a role to a user
	 */
	@Put('users/:userId/role')
	@UseGuards(PermissionGuard)
	@RequirePermission({
		id: 'users.update',
		name: 'Assign Role',
		description: 'Assign a role to a user',
		group: 'Users',
	})
	async assignRole(
		@Param('userId') userId: string,
		@Body() dto: AssignRoleDto,
	): Promise<{ assigned: boolean }> {
		await this.roleService.assignRoleToUser(userId, dto.roleName)
		return { assigned: true }
	}

	/**
	 * Get current user's permissions
	 */
	@Get('my-permissions')
	async getMyPermissions(
		@Req() req: AuthenticatedRequest,
	): Promise<{ permissions: string[] }> {
		const permissions = await this.roleService.getUserPermissions(req.user.id)
		return { permissions }
	}

	/**
	 * Check if current user has a specific permission
	 */
	@Get('check/:permission')
	async checkPermission(
		@Req() req: AuthenticatedRequest,
		@Param('permission') permission: string,
	): Promise<{ hasPermission: boolean }> {
		const hasPermission = await this.roleService.hasPermission(
			req.user.id,
			permission,
		)
		return { hasPermission }
	}
}
