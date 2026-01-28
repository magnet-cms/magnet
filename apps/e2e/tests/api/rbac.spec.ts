import { expect, test } from '../../src/fixtures/base.fixture'
import { testData } from '../../src/helpers/test-data'

test.describe('RBAC API', () => {
	test.describe('Roles', () => {
		test('GET /rbac/roles returns list of roles', async ({ apiClient }) => {
			const status = await apiClient.getAuthStatus()
			test.skip(status.requiresSetup === true, 'Setup required first')

			// Register and authenticate
			const userData = testData.user.create()
			const auth = await apiClient.register(userData)
			apiClient.setToken(auth.access_token)

			const response = await apiClient.getRoles()
			expect(response.ok()).toBeTruthy()

			const roles = await response.json()
			expect(Array.isArray(roles)).toBe(true)

			// Should have at least the default system roles
			const roleNames = roles.map((r: { name: string }) => r.name)
			expect(roleNames).toContain('admin')
			expect(roleNames).toContain('authenticated')
			expect(roleNames).toContain('public')
		})

		test('GET /rbac/roles/:id returns role details', async ({ apiClient }) => {
			const status = await apiClient.getAuthStatus()
			test.skip(status.requiresSetup === true, 'Setup required first')

			const userData = testData.user.create()
			const auth = await apiClient.register(userData)
			apiClient.setToken(auth.access_token)

			// Get list of roles first
			const listResponse = await apiClient.getRoles()
			const roles = await listResponse.json()
			const adminRole = roles.find((r: { name: string }) => r.name === 'admin')

			// Get specific role
			const response = await apiClient.getRole(adminRole.id)
			expect(response.ok()).toBeTruthy()

			const role = await response.json()
			expect(role.name).toBe('admin')
			expect(role.isSystem).toBe(true)
			expect(role.permissions).toContain('*')
		})

		test('POST /rbac/roles creates a new role', async ({ apiClient }) => {
			const status = await apiClient.getAuthStatus()
			test.skip(status.requiresSetup === true, 'Setup required first')

			const userData = testData.user.create()
			const auth = await apiClient.register(userData)
			apiClient.setToken(auth.access_token)

			const roleData = {
				name: `test-role-${Date.now()}`,
				displayName: 'Test Role',
				description: 'A test role for E2E testing',
				permissions: ['content.cats.find', 'content.cats.findOne'],
			}

			const response = await apiClient.createRole(roleData)
			expect(response.ok()).toBeTruthy()

			const role = await response.json()
			expect(role.name).toBe(roleData.name)
			expect(role.displayName).toBe(roleData.displayName)
			expect(role.permissions).toEqual(roleData.permissions)
			expect(role.isSystem).toBe(false)

			// Cleanup - delete the role
			await apiClient.deleteRole(role.id)
		})

		test('PUT /rbac/roles/:id updates a role', async ({ apiClient }) => {
			const status = await apiClient.getAuthStatus()
			test.skip(status.requiresSetup === true, 'Setup required first')

			const userData = testData.user.create()
			const auth = await apiClient.register(userData)
			apiClient.setToken(auth.access_token)

			// Create a role first
			const roleData = {
				name: `update-test-${Date.now()}`,
				displayName: 'Update Test Role',
			}
			const createResponse = await apiClient.createRole(roleData)
			const createdRole = await createResponse.json()

			// Update the role
			const updateData = {
				displayName: 'Updated Display Name',
				description: 'Updated description',
			}
			const updateResponse = await apiClient.updateRole(
				createdRole.id,
				updateData,
			)
			expect(updateResponse.ok()).toBeTruthy()

			const updatedRole = await updateResponse.json()
			expect(updatedRole.displayName).toBe(updateData.displayName)
			expect(updatedRole.description).toBe(updateData.description)

			// Cleanup
			await apiClient.deleteRole(createdRole.id)
		})

		test('DELETE /rbac/roles/:id deletes a role', async ({ apiClient }) => {
			const status = await apiClient.getAuthStatus()
			test.skip(status.requiresSetup === true, 'Setup required first')

			const userData = testData.user.create()
			const auth = await apiClient.register(userData)
			apiClient.setToken(auth.access_token)

			// Create a role to delete
			const roleData = {
				name: `delete-test-${Date.now()}`,
				displayName: 'Delete Test Role',
			}
			const createResponse = await apiClient.createRole(roleData)
			const createdRole = await createResponse.json()

			// Delete the role
			const deleteResponse = await apiClient.deleteRole(createdRole.id)
			expect(deleteResponse.ok()).toBeTruthy()

			// Verify it's deleted - should return 404
			const getResponse = await apiClient.getRole(createdRole.id)
			expect(getResponse.status()).toBe(404)
		})

		test('DELETE /rbac/roles/:id cannot delete system roles', async ({
			apiClient,
		}) => {
			const status = await apiClient.getAuthStatus()
			test.skip(status.requiresSetup === true, 'Setup required first')

			const userData = testData.user.create()
			const auth = await apiClient.register(userData)
			apiClient.setToken(auth.access_token)

			// Get the admin role
			const listResponse = await apiClient.getRoles()
			const roles = await listResponse.json()
			const adminRole = roles.find((r: { name: string }) => r.name === 'admin')

			// Try to delete the admin role - should fail
			const deleteResponse = await apiClient.deleteRole(adminRole.id)
			expect(deleteResponse.status()).toBe(400)
		})

		test('POST /rbac/roles/:id/duplicate duplicates a role', async ({
			apiClient,
		}) => {
			const status = await apiClient.getAuthStatus()
			test.skip(status.requiresSetup === true, 'Setup required first')

			const userData = testData.user.create()
			const auth = await apiClient.register(userData)
			apiClient.setToken(auth.access_token)

			// Create a role to duplicate
			const roleData = {
				name: `duplicate-source-${Date.now()}`,
				displayName: 'Duplicate Source',
				permissions: ['content.cats.find'],
			}
			const createResponse = await apiClient.createRole(roleData)
			const sourceRole = await createResponse.json()

			// Duplicate the role
			const duplicateData = {
				name: `duplicate-target-${Date.now()}`,
				displayName: 'Duplicate Target',
			}
			const duplicateResponse = await apiClient.duplicateRole(
				sourceRole.id,
				duplicateData,
			)
			expect(duplicateResponse.ok()).toBeTruthy()

			const duplicatedRole = await duplicateResponse.json()
			expect(duplicatedRole.name).toBe(duplicateData.name)
			expect(duplicatedRole.displayName).toBe(duplicateData.displayName)
			expect(duplicatedRole.permissions).toEqual(sourceRole.permissions)
			expect(duplicatedRole.isSystem).toBe(false)

			// Cleanup
			await apiClient.deleteRole(sourceRole.id)
			await apiClient.deleteRole(duplicatedRole.id)
		})

		test('PUT /rbac/roles/:id/permissions updates role permissions', async ({
			apiClient,
		}) => {
			const status = await apiClient.getAuthStatus()
			test.skip(status.requiresSetup === true, 'Setup required first')

			const userData = testData.user.create()
			const auth = await apiClient.register(userData)
			apiClient.setToken(auth.access_token)

			// Create a role
			const roleData = {
				name: `perm-test-${Date.now()}`,
				displayName: 'Permission Test Role',
				permissions: ['content.cats.find'],
			}
			const createResponse = await apiClient.createRole(roleData)
			const createdRole = await createResponse.json()

			// Update permissions
			const newPermissions = [
				'content.cats.find',
				'content.cats.create',
				'content.cats.update',
			]
			const updateResponse = await apiClient.updateRolePermissions(
				createdRole.id,
				newPermissions,
			)
			expect(updateResponse.ok()).toBeTruthy()

			const updatedRole = await updateResponse.json()
			expect(updatedRole.permissions).toEqual(newPermissions)

			// Cleanup
			await apiClient.deleteRole(createdRole.id)
		})
	})

	test.describe('Permissions', () => {
		test('GET /rbac/permissions returns categorized permissions', async ({
			apiClient,
		}) => {
			const status = await apiClient.getAuthStatus()
			test.skip(status.requiresSetup === true, 'Setup required first')

			const userData = testData.user.create()
			const auth = await apiClient.register(userData)
			apiClient.setToken(auth.access_token)

			const response = await apiClient.getPermissions()
			expect(response.ok()).toBeTruthy()

			const permissions = await response.json()
			expect(permissions).toHaveProperty('collectionTypes')
			expect(permissions).toHaveProperty('plugins')
			expect(permissions).toHaveProperty('system')
			expect(Array.isArray(permissions.collectionTypes)).toBe(true)
		})

		test('GET /rbac/my-permissions returns current user permissions', async ({
			apiClient,
		}) => {
			const status = await apiClient.getAuthStatus()
			test.skip(status.requiresSetup === true, 'Setup required first')

			const userData = testData.user.create()
			const auth = await apiClient.register(userData)
			apiClient.setToken(auth.access_token)

			const response = await apiClient.getMyPermissions()
			expect(response.ok()).toBeTruthy()

			const result = await response.json()
			expect(result).toHaveProperty('permissions')
			expect(Array.isArray(result.permissions)).toBe(true)
		})

		test('GET /rbac/check/:permission checks a specific permission', async ({
			apiClient,
		}) => {
			const status = await apiClient.getAuthStatus()
			test.skip(status.requiresSetup === true, 'Setup required first')

			const userData = testData.user.create()
			const auth = await apiClient.register(userData)
			apiClient.setToken(auth.access_token)

			const response = await apiClient.checkPermission('content.cats.find')
			expect(response.ok()).toBeTruthy()

			const result = await response.json()
			expect(result).toHaveProperty('hasPermission')
			expect(typeof result.hasPermission).toBe('boolean')
		})
	})

	test.describe('User Role Assignment', () => {
		test('PUT /rbac/users/:userId/role assigns role to user', async ({
			apiClient,
		}) => {
			const status = await apiClient.getAuthStatus()
			test.skip(status.requiresSetup === true, 'Setup required first')

			// Register first user (admin)
			const adminData = testData.user.create()
			const adminAuth = await apiClient.register(adminData)
			apiClient.setToken(adminAuth.access_token)

			// Get current user ID
			const meResponse = await apiClient.getMe()
			const adminUser = await meResponse.json()

			// Create a custom role
			const roleData = {
				name: `assign-test-${Date.now()}`,
				displayName: 'Assignment Test Role',
				permissions: ['content.cats.find'],
			}
			const createResponse = await apiClient.createRole(roleData)
			const role = await createResponse.json()

			// Assign the role to the admin user
			const assignResponse = await apiClient.assignUserRole(
				adminUser.id,
				role.name,
			)
			expect(assignResponse.ok()).toBeTruthy()

			// Cleanup
			await apiClient.deleteRole(role.id)
		})
	})

	test.describe('Authentication Required', () => {
		test('GET /rbac/roles requires authentication', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(`${apiBaseURL}/rbac/roles`)
			expect(response.status()).toBe(401)
		})

		test('GET /rbac/permissions requires authentication', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(`${apiBaseURL}/rbac/permissions`)
			expect(response.status()).toBe(401)
		})

		test('GET /rbac/my-permissions requires authentication', async ({
			request,
			apiBaseURL,
		}) => {
			const response = await request.get(`${apiBaseURL}/rbac/my-permissions`)
			expect(response.status()).toBe(401)
		})
	})
})
