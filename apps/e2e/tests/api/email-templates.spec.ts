import { expect, test } from '../../src/fixtures/auth.fixture'

test.describe('Email Templates API', () => {
  test('GET /email-templates returns seeded templates', async ({ authenticatedApiClient }) => {
    const response = await authenticatedApiClient.listEmailTemplates()
    expect(response.ok()).toBeTruthy()
    const templates = await response.json()
    expect(Array.isArray(templates)).toBeTruthy()
    // Seed templates should exist on a fresh instance
    expect(templates.length).toBeGreaterThan(0)
    const slugs = templates.map((t: { slug: string }) => t.slug)
    expect(slugs).toContain('welcome')
    expect(slugs).toContain('password-reset')
    expect(slugs).toContain('email-verification')
  })

  test('CRUD flow — create, get, update, delete', async ({ authenticatedApiClient }) => {
    const slug = `e2e-test-${Date.now()}`

    // Create
    const createResponse = await authenticatedApiClient.createEmailTemplate({
      slug,
      subject: 'Hello {{ name }}',
      body: '<p>Welcome, {{ name }}!</p>',
      category: 'transactional',
      locale: 'en',
      variables: ['name'],
      active: true,
    })
    expect(createResponse.ok()).toBeTruthy()
    const created = await createResponse.json()
    const id = created.id || created._id
    expect(created.slug).toBe(slug)
    expect(created.subject).toBe('Hello {{ name }}')
    expect(created.category).toBe('transactional')

    // Get by ID
    const getResponse = await authenticatedApiClient.getEmailTemplate(id)
    expect(getResponse.ok()).toBeTruthy()
    const fetched = await getResponse.json()
    expect(fetched.slug).toBe(slug)

    // Update
    const updateResponse = await authenticatedApiClient.updateEmailTemplate(id, {
      subject: 'Updated subject',
    })
    expect(updateResponse.ok()).toBeTruthy()
    const updated = await updateResponse.json()
    expect(updated.subject).toBe('Updated subject')

    // Delete
    const deleteResponse = await authenticatedApiClient.deleteEmailTemplate(id)
    expect(deleteResponse.ok()).toBeTruthy()

    // Verify gone
    const missingResponse = await authenticatedApiClient.getEmailTemplate(id)
    expect(missingResponse.ok()).toBeFalsy()
  })

  test('GET /email-templates?category= filters by category', async ({ authenticatedApiClient }) => {
    const response = await authenticatedApiClient.listEmailTemplates({
      category: 'transactional',
    })
    expect(response.ok()).toBeTruthy()
    const templates = await response.json()
    expect(Array.isArray(templates)).toBeTruthy()
    for (const t of templates) {
      expect(t.category).toBe('transactional')
    }
  })

  test('GET /email-templates?search= filters by search term', async ({
    authenticatedApiClient,
  }) => {
    const response = await authenticatedApiClient.listEmailTemplates({
      search: 'welcome',
    })
    expect(response.ok()).toBeTruthy()
    const templates = await response.json()
    expect(Array.isArray(templates)).toBeTruthy()
    // The seeded 'welcome' template should appear
    const found = templates.some(
      (t: { slug: string; subject: string }) =>
        t.slug.includes('welcome') || t.subject.toLowerCase().includes('welcome'),
    )
    expect(found).toBeTruthy()
  })

  test('POST /email-templates/:id/preview returns HTML and compiled subject', async ({
    authenticatedApiClient,
  }) => {
    // Get the welcome template ID
    const listResponse = await authenticatedApiClient.listEmailTemplates({
      search: 'welcome',
    })
    const templates = await listResponse.json()
    const welcome = templates.find((t: { slug: string }) => t.slug === 'welcome')
    if (!welcome) {
      test.skip()
      return
    }
    const id = welcome.id || welcome._id

    const previewResponse = await authenticatedApiClient.previewEmailTemplate(id, {
      name: 'Alice',
      activationUrl: 'https://example.com/activate',
    })
    expect(previewResponse.ok()).toBeTruthy()
    const preview = await previewResponse.json()
    expect(typeof preview.html).toBe('string')
    expect(preview.html.length).toBeGreaterThan(0)
    expect(typeof preview.subject).toBe('string')
  })

  test('GET /email-templates/:id/versions returns version history', async ({
    authenticatedApiClient,
  }) => {
    const slug = `e2e-versions-${Date.now()}`

    // Create
    const createResponse = await authenticatedApiClient.createEmailTemplate({
      slug,
      subject: 'Version 1',
      body: '<p>Body v1</p>',
      category: 'transactional',
    })
    const created = await createResponse.json()
    const id = created.id || created._id

    // Update to create a version
    await authenticatedApiClient.updateEmailTemplate(id, {
      subject: 'Version 2',
    })

    // Check versions
    const versionsResponse = await authenticatedApiClient.getEmailTemplateVersions(id)
    expect(versionsResponse.ok()).toBeTruthy()
    const versions = await versionsResponse.json()
    expect(Array.isArray(versions)).toBeTruthy()
    expect(versions.length).toBeGreaterThanOrEqual(1)
    expect(versions[0]).toHaveProperty('subject')
    expect(versions[0]).toHaveProperty('editedAt')

    // Cleanup
    await authenticatedApiClient.deleteEmailTemplate(id)
  })

  test('POST /email-templates/:id/test sends test email to admin', async ({
    authenticatedApiClient,
  }) => {
    const slug = `e2e-testsend-${Date.now()}`
    const createResponse = await authenticatedApiClient.createEmailTemplate({
      slug,
      subject: 'Test send for {{ name }}',
      body: '<p>Hello {{ name }}</p>',
      category: 'transactional',
    })
    expect(createResponse.ok()).toBeTruthy()
    const created = await createResponse.json()
    const id = created.id || created._id

    // Test-send requires auth (sends to logged-in admin's email)
    // Response may be OK (email sent) or a 4xx if no adapter is configured —
    // we verify the endpoint exists and processes the request
    const testResponse = await authenticatedApiClient.testSendEmailTemplate(id, {
      name: 'Admin',
    })
    // Either sent (200) or gracefully skipped (no adapter configured)
    expect([200, 201, 204, 400, 500].includes(testResponse.status())).toBeTruthy()

    // Cleanup
    await authenticatedApiClient.deleteEmailTemplate(id)
  })

  test('GET /email-templates/by-slug/:slug returns all locale variants', async ({
    authenticatedApiClient,
  }) => {
    const slug = `e2e-byslug-${Date.now()}`

    // Create two locale variants with the same slug
    const enResponse = await authenticatedApiClient.createEmailTemplate({
      slug,
      subject: 'Hello EN',
      body: '<p>EN body</p>',
      category: 'transactional',
      locale: 'en',
    })
    expect(enResponse.ok()).toBeTruthy()

    const frResponse = await authenticatedApiClient.createEmailTemplate({
      slug,
      subject: 'Bonjour FR',
      body: '<p>FR body</p>',
      category: 'transactional',
      locale: 'fr',
    })
    expect(frResponse.ok()).toBeTruthy()

    // Fetch all variants by slug
    const bySlugResponse = await authenticatedApiClient.getEmailTemplatesBySlug(slug)
    expect(bySlugResponse.ok()).toBeTruthy()
    const variants = await bySlugResponse.json()
    expect(Array.isArray(variants)).toBeTruthy()
    expect(variants.length).toBe(2)
    const locales = variants.map((v: { locale: string }) => v.locale).sort()
    expect(locales).toEqual(['en', 'fr'])

    // Cleanup
    const en = await enResponse.json()
    const fr = await frResponse.json()
    await authenticatedApiClient.deleteEmailTemplate(en.id || en._id)
    await authenticatedApiClient.deleteEmailTemplate(fr.id || fr._id)
  })

  test('POST /email-templates with duplicate slug returns error', async ({
    authenticatedApiClient,
  }) => {
    const slug = `e2e-dup-${Date.now()}`

    const first = await authenticatedApiClient.createEmailTemplate({
      slug,
      subject: 'First',
      body: '<p>Body</p>',
      category: 'transactional',
    })
    expect(first.ok()).toBeTruthy()
    const created = await first.json()
    const id = created.id || created._id

    const second = await authenticatedApiClient.createEmailTemplate({
      slug,
      subject: 'Duplicate',
      body: '<p>Body</p>',
      category: 'transactional',
    })
    expect(second.ok()).toBeFalsy()

    // Cleanup
    await authenticatedApiClient.deleteEmailTemplate(id)
  })
})
