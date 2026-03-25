import { expect, test } from '../../src/fixtures/auth.fixture'

test.describe('Webhooks API', () => {
  test('CRUD flow — create, list, get, update, delete webhook', async ({
    authenticatedApiClient,
  }) => {
    // Create
    const createResponse = await authenticatedApiClient.createWebhook({
      name: `E2E Test Webhook ${Date.now()}`,
      url: 'https://httpbin.org/post',
      events: ['content.created', 'content.updated'],
      description: 'Created by E2E test',
    })
    expect(createResponse.ok()).toBeTruthy()
    const created = await createResponse.json()
    const webhookId = created.id || created._id
    expect(created.name).toContain('E2E Test Webhook')
    expect(created.url).toBe('https://httpbin.org/post')
    expect(created.events).toEqual(['content.created', 'content.updated'])
    // Secret should be visible on create (full 64-char hex)
    expect(created.secret).toBeTruthy()
    expect(created.secret.length).toBe(64)

    // List
    const listResponse = await authenticatedApiClient.getWebhooks()
    expect(listResponse.ok()).toBeTruthy()
    const webhooks = await listResponse.json()
    expect(Array.isArray(webhooks)).toBeTruthy()
    const found = webhooks.find((w: { id?: string; _id?: string }) => (w.id || w._id) === webhookId)
    expect(found).toBeTruthy()
    // Secret should be masked in list
    expect(found.secret).toMatch(/^\*\*\*\.\.\./)

    // Get by ID
    const getResponse = await authenticatedApiClient.getWebhook(webhookId)
    expect(getResponse.ok()).toBeTruthy()
    const fetched = await getResponse.json()
    expect(fetched.name).toContain('E2E Test Webhook')
    // Secret masked
    expect(fetched.secret).toMatch(/^\*\*\*\.\.\./)

    // Update
    const updateResponse = await authenticatedApiClient.updateWebhook(webhookId, {
      name: 'Updated E2E Webhook',
      events: ['content.created', 'content.deleted'],
    })
    expect(updateResponse.ok()).toBeTruthy()
    const updated = await updateResponse.json()
    expect(updated.name).toBe('Updated E2E Webhook')
    expect(updated.events).toContain('content.deleted')

    // Delete
    const deleteResponse = await authenticatedApiClient.deleteWebhook(webhookId)
    expect(deleteResponse.ok()).toBeTruthy()

    // Verify gone
    const deletedResponse = await authenticatedApiClient.getWebhook(webhookId)
    expect(deletedResponse.ok()).toBeFalsy()
  })

  test('POST /webhooks/:id/test sends test delivery', async ({ authenticatedApiClient }) => {
    // Create webhook pointing to the app's own health endpoint.
    // NOTE: The webhook test mechanism sends a POST request, but /health
    // only accepts GET, so the delivery will report success: false with
    // a 404 status. We verify the delivery infrastructure works correctly.
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000'
    const createResponse = await authenticatedApiClient.createWebhook({
      name: `Test Delivery ${Date.now()}`,
      url: `${apiBaseUrl}/health`,
      events: ['content.created'],
    })
    expect(createResponse.ok()).toBeTruthy()
    const created = await createResponse.json()
    const webhookId = created.id || created._id

    // Test — delivery is attempted; /health rejects POST with 404
    const testResponse = await authenticatedApiClient.testWebhook(webhookId)
    expect(testResponse.ok()).toBeTruthy()
    const result = await testResponse.json()
    expect(result.duration).toBeGreaterThan(0)
    // Delivery attempted but target returns 404 for POST
    expect(result.success).toBe(false)
    expect(result.statusCode).toBe(404)

    // Check delivery log
    const deliveriesResponse = await authenticatedApiClient.getWebhookDeliveries(webhookId)
    expect(deliveriesResponse.ok()).toBeTruthy()
    const deliveries = await deliveriesResponse.json()
    expect(deliveries.items.length).toBeGreaterThan(0)
    expect(deliveries.items[0].event).toBe('webhook.test')

    // Cleanup
    await authenticatedApiClient.deleteWebhook(webhookId)
  })

  test('POST /webhooks/:id/regenerate-secret returns new secret', async ({
    authenticatedApiClient,
  }) => {
    const createResponse = await authenticatedApiClient.createWebhook({
      name: `Regen Secret ${Date.now()}`,
      url: 'https://example.com/hook',
      events: ['content.created'],
    })
    const created = await createResponse.json()
    const webhookId = created.id || created._id
    const originalSecret = created.secret

    const regenResponse = await authenticatedApiClient.regenerateWebhookSecret(webhookId)
    expect(regenResponse.ok()).toBeTruthy()
    const regen = await regenResponse.json()
    expect(regen.secret).toBeTruthy()
    expect(regen.secret.length).toBe(64)
    expect(regen.secret).not.toBe(originalSecret)

    // Cleanup
    await authenticatedApiClient.deleteWebhook(webhookId)
  })

  test('GET /webhooks is publicly accessible', async ({ apiClient }) => {
    // Webhooks endpoint does not require authentication
    const response = await apiClient.getWebhooks()
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(Array.isArray(body)).toBeTruthy()
  })

  test('event-triggered delivery — content.created fires webhook', async ({
    authenticatedApiClient,
  }) => {
    // Create webhook subscribed to content.created, pointing to app's health
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000'
    const createResponse = await authenticatedApiClient.createWebhook({
      name: `Event Trigger ${Date.now()}`,
      url: `${apiBaseUrl}/health`,
      events: ['content.created'],
      enabled: true,
    })
    expect(createResponse.ok()).toBeTruthy()
    const created = await createResponse.json()
    const webhookId = created.id || created._id

    // Create content to trigger the event — use 'owner' schema (no foreign keys)
    const contentResponse = await authenticatedApiClient.createContent('owner', {
      name: `WebhookTestOwner-${Date.now()}`,
      email: `webhook-${Date.now()}@test.com`,
      phone: '+1-555-0199-000',
    })
    expect(contentResponse.ok()).toBeTruthy()

    // Wait for async webhook delivery (up to 5s)
    let deliveryFound = false
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      const deliveriesResponse = await authenticatedApiClient.getWebhookDeliveries(webhookId)
      if (deliveriesResponse.ok()) {
        const deliveries = await deliveriesResponse.json()
        if (deliveries.items.some((d: { event: string }) => d.event === 'content.created')) {
          deliveryFound = true
          break
        }
      }
    }

    expect(deliveryFound).toBe(true)

    // Cleanup
    await authenticatedApiClient.deleteWebhook(webhookId)
    const content = await contentResponse.json()
    const docId = content.documentId || content.id || content._id
    if (docId) {
      await authenticatedApiClient.deleteContent('owner', docId).catch(() => {})
    }
  })
})
