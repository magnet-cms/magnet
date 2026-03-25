import 'reflect-metadata'
import { BadRequestException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@magnet-cms/common', () => ({
	InjectModel: () => () => {},
	Model: class {},
	Schema: () => () => {},
	Field: new Proxy({}, { get: () => () => () => {} }),
	Prop: () => () => {},
	RoleNotFoundError: class RoleNotFoundError extends Error {
		constructor(id: string) {
			super(`Role not found: ${id}`)
			this.name = 'RoleNotFoundError'
		}
	},
	PermissionNotFoundError: class PermissionNotFoundError extends Error {
		constructor(ids: string[]) {
			super(`Permissions not found: ${ids.join(', ')}`)
			this.name = 'PermissionNotFoundError'
		}
	},
}))

import { RoleService } from '../services/role.service'

// ─── Mock Dependencies ────────────────────────────────────────────────────────

const mockRoleModel = {
	find: vi.fn(),
	findOne: vi.fn(),
	findMany: vi.fn(),
	findById: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
}

const mockPermissionDiscovery = {
	getAll: vi.fn(() => []),
	getCategorized: vi.fn(() => ({
		collectionTypes: [],
		controllers: [],
		plugins: [],
		system: [],
	})),
	markPermissions: vi.fn((items: unknown[]) => items),
}

const mockPermissionService = {
	validatePermissionIds: vi.fn().mockResolvedValue({ valid: [], invalid: [] }),
}

const mockEventService = {
	emit: vi.fn().mockResolvedValue(undefined),
}

const mockUserService = {
	findAll: vi.fn(),
	findOneById: vi.fn(),
	update: vi.fn(),
}

const mockLogger = {
	setContext: vi.fn(),
	log: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeRole = (
	overrides: Partial<{
		id: string
		name: string
		displayName: string
		permissions: string[]
		isSystem: boolean
	}> = {},
) => ({
	id: 'role-1',
	name: 'editor',
	displayName: 'Editor',
	description: 'Content editor',
	permissions: ['content.create', 'content.update'],
	isSystem: false,
	createdAt: new Date(),
	...overrides,
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RoleService', () => {
	let service: RoleService

	beforeEach(() => {
		vi.clearAllMocks()
		mockRoleModel.findOne.mockResolvedValue(null) // default: role doesn't exist

		service = new RoleService(
			mockRoleModel as never,
			mockPermissionDiscovery as never,
			mockPermissionService as never,
			mockEventService as never,
			mockUserService as never,
			mockLogger as never,
		)
	})

	// ─── checkPermission (synchronous) ──────────────────────────────────────

	describe('checkPermission', () => {
		it('should allow wildcard * (grants all permissions)', () => {
			expect(service.checkPermission(['*'], 'content.posts.create')).toBe(true)
		})

		it('should allow exact permission match', () => {
			expect(
				service.checkPermission(['content.create'], 'content.create'),
			).toBe(true)
		})

		it('should allow partial wildcard (content.*)', () => {
			expect(
				service.checkPermission(['content.*'], 'content.posts.create'),
			).toBe(true)
		})

		it('should allow nested partial wildcard (content.posts.*)', () => {
			expect(
				service.checkPermission(['content.posts.*'], 'content.posts.create'),
			).toBe(true)
		})

		it('should deny permission not in list', () => {
			expect(service.checkPermission(['content.read'], 'content.delete')).toBe(
				false,
			)
		})

		it('should deny when permission list is empty', () => {
			expect(service.checkPermission([], 'content.create')).toBe(false)
		})

		it('should not match parent namespace as wildcard', () => {
			// 'content' does not match 'content.posts.create' unless wildcard is explicit
			expect(service.checkPermission(['content'], 'content.posts.create')).toBe(
				false,
			)
		})
	})

	// ─── CRUD ────────────────────────────────────────────────────────────────

	describe('findAll', () => {
		it('should return all roles', async () => {
			const roles = [makeRole()]
			mockRoleModel.find.mockResolvedValue(roles)

			expect(await service.findAll()).toEqual(roles)
		})
	})

	describe('findById', () => {
		it('should return role by id', async () => {
			const role = makeRole()
			mockRoleModel.findOne.mockResolvedValue(role)

			expect(await service.findById('role-1')).toEqual(role)
		})

		it('should return null if not found', async () => {
			mockRoleModel.findOne.mockResolvedValue(null)
			expect(await service.findById('nonexistent')).toBeNull()
		})
	})

	describe('findByName', () => {
		it('should return role by name', async () => {
			const role = makeRole()
			mockRoleModel.findOne.mockResolvedValue(role)

			expect(await service.findByName('editor')).toEqual(role)
		})
	})

	describe('create', () => {
		it('should create a role and emit event', async () => {
			const role = makeRole()
			mockRoleModel.create.mockResolvedValue(role)

			const result = await service.create({
				name: 'editor',
				displayName: 'Editor',
				permissions: ['content.create'],
			})

			expect(result).toEqual(role)
			expect(mockEventService.emit).toHaveBeenCalledWith(
				'role.created',
				expect.objectContaining({ roleName: 'editor' }),
			)
		})

		it('should default permissions to empty array', async () => {
			mockRoleModel.create.mockImplementation((data) =>
				Promise.resolve({ ...data, id: 'role-new' }),
			)

			await service.create({ name: 'viewer', displayName: 'Viewer' })

			expect(mockRoleModel.create).toHaveBeenCalledWith(
				expect.objectContaining({ permissions: [] }),
			)
		})
	})

	// ─── delete ──────────────────────────────────────────────────────────────

	describe('delete', () => {
		it('should delete a non-system role with no users', async () => {
			const role = makeRole({ isSystem: false })
			mockRoleModel.findOne.mockResolvedValue(role)
			mockUserService.findAll.mockResolvedValue([])
			mockRoleModel.delete.mockResolvedValue(true)

			await service.delete('role-1')
			expect(mockRoleModel.delete).toHaveBeenCalledWith({ id: 'role-1' })
		})

		it('should throw when deleting a system role', async () => {
			const role = makeRole({ isSystem: true })
			mockRoleModel.findOne.mockResolvedValue(role)

			await expect(service.delete('role-1')).rejects.toThrow(
				BadRequestException,
			)
		})

		it('should throw when users have the role assigned', async () => {
			const role = makeRole({ name: 'editor', isSystem: false })
			mockRoleModel.findOne.mockResolvedValue(role)
			mockUserService.findAll.mockResolvedValue([{ id: 'u-1', role: 'editor' }])

			await expect(service.delete('role-1')).rejects.toThrow(
				BadRequestException,
			)
		})

		it('should throw RoleNotFoundError if role does not exist', async () => {
			mockRoleModel.findOne.mockResolvedValue(null)

			await expect(service.delete('nonexistent')).rejects.toThrow()
		})
	})

	// ─── duplicate ───────────────────────────────────────────────────────────

	describe('duplicate', () => {
		it('should create a copy of a role with new name', async () => {
			const source = makeRole({
				name: 'editor',
				permissions: ['content.create'],
			})
			mockRoleModel.findOne
				.mockResolvedValueOnce(source) // findById (source)
				.mockResolvedValueOnce(null) // findByName check (new name not taken)
			mockRoleModel.create.mockImplementation((data) =>
				Promise.resolve({ ...data, id: 'role-copy' }),
			)

			const result = await service.duplicate('role-1', {
				name: 'editor-copy',
				displayName: 'Editor Copy',
			})

			expect(result.name).toBe('editor-copy')
			expect(result.isSystem).toBe(false)
			expect(result.permissions).toEqual(['content.create'])
		})

		it('should throw when target name already exists', async () => {
			const source = makeRole()
			const existing = makeRole({ id: 'role-2', name: 'editor-copy' })
			mockRoleModel.findOne
				.mockResolvedValueOnce(source) // source found
				.mockResolvedValueOnce(existing) // target name taken

			await expect(
				service.duplicate('role-1', {
					name: 'editor-copy',
					displayName: 'Copy',
				}),
			).rejects.toThrow()
		})
	})

	// ─── permission cache ────────────────────────────────────────────────────

	describe('permission cache', () => {
		it('should cache permission check result', async () => {
			const role = makeRole({ permissions: ['content.create'] })
			mockRoleModel.findOne.mockResolvedValue(role)

			// First call → DB hit
			await service.roleHasPermission('editor', 'content.create')
			// Second call → cache hit
			await service.roleHasPermission('editor', 'content.create')

			expect(mockRoleModel.findOne).toHaveBeenCalledTimes(1)
		})

		it('should return true from cache on subsequent calls', async () => {
			const role = makeRole({ permissions: ['content.create'] })
			mockRoleModel.findOne.mockResolvedValue(role)

			const first = await service.roleHasPermission('editor', 'content.create')
			const second = await service.roleHasPermission('editor', 'content.create')

			expect(first).toBe(true)
			expect(second).toBe(true)
		})

		it('should clear cache when setCacheEnabled(false) is called', async () => {
			const role = makeRole({ permissions: ['content.create'] })
			mockRoleModel.findOne.mockResolvedValue(role)

			// Populate cache
			await service.roleHasPermission('editor', 'content.create')
			// Disable cache (also clears it)
			service.setCacheEnabled(false)
			// Re-enable cache
			service.setCacheEnabled(true)
			// Next call should hit DB again
			await service.roleHasPermission('editor', 'content.create')

			expect(mockRoleModel.findOne).toHaveBeenCalledTimes(2)
		})

		it('should expire cache entry after TTL', async () => {
			vi.useFakeTimers()
			const role = makeRole({ permissions: ['content.create'] })
			mockRoleModel.findOne.mockResolvedValue(role)

			service.setCacheTTL(1000)

			// First call → DB hit, populates cache
			await service.roleHasPermission('editor', 'content.create')
			expect(mockRoleModel.findOne).toHaveBeenCalledTimes(1)

			// Advance past TTL
			vi.advanceTimersByTime(1500)

			// Next call → cache expired, hits DB again
			await service.roleHasPermission('editor', 'content.create')
			expect(mockRoleModel.findOne).toHaveBeenCalledTimes(2)

			vi.useRealTimers()
		})
	})

	// ─── onModuleInit (ensureDefaultRoles) ───────────────────────────────────

	describe('onModuleInit', () => {
		it('should create default system roles if they do not exist', async () => {
			mockRoleModel.findOne.mockResolvedValue(null) // all roles missing
			mockRoleModel.create.mockImplementation((data) =>
				Promise.resolve({ ...data, id: 'new-role' }),
			)

			await service.onModuleInit()

			// 3 default roles: admin, authenticated, public
			expect(mockRoleModel.create).toHaveBeenCalledTimes(3)
		})

		it('should not create roles that already exist', async () => {
			mockRoleModel.findOne.mockResolvedValue({ id: 'existing', name: 'admin' })

			await service.onModuleInit()

			expect(mockRoleModel.create).not.toHaveBeenCalled()
		})
	})
})
