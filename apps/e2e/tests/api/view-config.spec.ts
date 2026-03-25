import { expect, test } from '../../src/fixtures/auth.fixture'

test.describe('View Config API', () => {
  test.describe('GET /user-preferences/view-config/:schema', () => {
    test('returns default config when none saved', async ({ authenticatedApiClient }) => {
      const response = await authenticatedApiClient.getViewConfig('blog')
      expect(response.ok()).toBeTruthy()
      const body = await response.json()
      expect(body).toHaveProperty('columns')
      expect(Array.isArray(body.columns)).toBe(true)
      expect(body).toHaveProperty('pageSize')
      expect(typeof body.pageSize).toBe('number')
      expect(body).toHaveProperty('updatedAt')
    })

    test('requires authentication', async ({ request, apiBaseURL }) => {
      const response = await request.get(`${apiBaseURL}/user-preferences/view-config/blog`)
      expect(response.status()).toBe(401)
    })
  })

  test.describe('PUT /user-preferences/view-config/:schema', () => {
    test('saves and returns view config', async ({ authenticatedApiClient }) => {
      const config = {
        columns: [
          { name: 'title', visible: true, order: 0 },
          { name: 'status', visible: false, order: 1 },
        ],
        pageSize: 20,
        sortField: 'title',
        sortDirection: 'asc' as const,
      }
      const response = await authenticatedApiClient.putViewConfig('blog', config)
      expect(response.ok()).toBeTruthy()
      const body = await response.json()
      expect(body).toHaveProperty('columns')
      expect(body.columns).toHaveLength(2)
      expect(body.pageSize).toBe(20)
      expect(body).toHaveProperty('updatedAt')
    })

    test('GET returns previously saved config', async ({ authenticatedApiClient }) => {
      const config = {
        columns: [{ name: 'slug', visible: true, order: 0 }],
        pageSize: 30,
      }
      await authenticatedApiClient.putViewConfig('page', config)
      const response = await authenticatedApiClient.getViewConfig('page')
      expect(response.ok()).toBeTruthy()
      const body = await response.json()
      expect(body.pageSize).toBe(30)
      expect(body.columns).toHaveLength(1)
      expect(body.columns[0].name).toBe('slug')
    })

    test('requires authentication', async ({ request, apiBaseURL }) => {
      const response = await request.put(`${apiBaseURL}/user-preferences/view-config/blog`, {
        data: { columns: [], pageSize: 10 },
      })
      expect(response.status()).toBe(401)
    })
  })
})
