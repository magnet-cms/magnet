import { expect, test } from '../../src/fixtures/auth.fixture'
import { testData } from '../../src/helpers/test-data'

test.describe('Users API', () => {
  test.describe('CRUD operations', () => {
    test('POST /users creates a user', async ({ authenticatedApiClient, cleanup }) => {
      const userData = testData.user.create()
      const response = await authenticatedApiClient.createUser(userData)
      expect(response.ok()).toBeTruthy()

      const user = await response.json()
      expect(user.email).toBe(userData.email)
      expect(user.name).toBe(userData.name)

      cleanup.trackUser(authenticatedApiClient, user.id ?? user._id)
    })

    test('GET /users returns paginated user list', async ({ authenticatedApiClient }) => {
      const response = await authenticatedApiClient.getUsers()
      expect(response.ok()).toBeTruthy()

      const result = await response.json()
      // May return array or paginated object depending on implementation
      const users = Array.isArray(result)
        ? result
        : (result.users ?? result.data ?? result.items ?? result)
      expect(Array.isArray(users)).toBe(true)
    })

    test('GET /users with pagination params', async ({ authenticatedApiClient }) => {
      const response = await authenticatedApiClient.getUsers({
        page: 1,
        limit: 5,
      })
      expect(response.ok()).toBeTruthy()
    })

    test('GET /users/:id returns a user', async ({ authenticatedApiClient, cleanup }) => {
      const userData = testData.user.create()
      const createRes = await authenticatedApiClient.createUser(userData)
      const created = await createRes.json()
      const userId = created.id ?? created._id

      cleanup.trackUser(authenticatedApiClient, userId)

      const response = await authenticatedApiClient.getUser(userId)
      expect(response.ok()).toBeTruthy()

      const user = await response.json()
      expect(user.email).toBe(userData.email)
    })

    test('GET /users/:id returns empty for nonexistent user', async ({
      authenticatedApiClient,
    }) => {
      // Use a well-formed but nonexistent MongoDB ObjectId
      const response = await authenticatedApiClient.getUser('000000000000000000000000')
      // API returns 200 with empty body for nonexistent users
      const body = await response.text()
      expect(body === '' || body === 'null').toBe(true)
    })

    test('PUT /users/:id updates a user', async ({ authenticatedApiClient, cleanup }) => {
      const userData = testData.user.create()
      const createRes = await authenticatedApiClient.createUser(userData)
      const created = await createRes.json()
      const userId = created.id ?? created._id
      cleanup.trackUser(authenticatedApiClient, userId)

      const updateRes = await authenticatedApiClient.updateUser(userId, {
        name: 'Updated User Name',
      })
      expect(updateRes.ok()).toBeTruthy()

      const getRes = await authenticatedApiClient.getUser(userId)
      const updated = await getRes.json()
      expect(updated.name).toBe('Updated User Name')
    })

    test('DELETE /users/:id deletes a user', async ({ authenticatedApiClient }) => {
      const userData = testData.user.create()
      const createRes = await authenticatedApiClient.createUser(userData)
      const created = await createRes.json()
      const userId = created.id ?? created._id

      const deleteRes = await authenticatedApiClient.deleteUser(userId)
      expect(deleteRes.ok()).toBeTruthy()

      // API returns 200 with empty body for deleted/nonexistent users
      const getRes = await authenticatedApiClient.getUser(userId)
      const body = await getRes.text()
      expect(body === '' || body === 'null').toBe(true)
    })

    test('POST /users/:id/reset-password resets user password', async ({
      authenticatedApiClient,
      cleanup,
    }) => {
      const userData = testData.user.create()
      const createRes = await authenticatedApiClient.createUser(userData)
      const created = await createRes.json()
      const userId = created.id ?? created._id
      cleanup.trackUser(authenticatedApiClient, userId)

      const resetRes = await authenticatedApiClient.resetUserPassword(
        userId,
        'NewSecurePassword456!',
      )
      expect(resetRes.ok()).toBeTruthy()

      const result = await resetRes.json()
      expect(result).toHaveProperty('message')
    })
  })

  test.describe('Authentication required', () => {
    test('GET /users requires authentication', async ({ request, apiBaseURL }) => {
      const response = await request.get(`${apiBaseURL}/users`)
      expect(response.status()).toBe(401)
    })

    test('POST /users requires authentication', async ({ request, apiBaseURL }) => {
      const response = await request.post(`${apiBaseURL}/users`, {
        data: testData.user.create(),
      })
      expect(response.status()).toBe(401)
    })

    test('DELETE /users/:id requires authentication', async ({ request, apiBaseURL }) => {
      const response = await request.delete(`${apiBaseURL}/users/000000000000000000000000`)
      expect(response.status()).toBe(401)
    })
  })
})
