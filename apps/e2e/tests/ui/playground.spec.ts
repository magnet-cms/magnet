import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { adminPath, POST_LOGIN_URL } from '../../src/helpers/admin-paths'
import { LoginPage } from '../../src/page-objects/login.page'

authTest.describe('Playground UI', () => {
  authTest.beforeEach(async ({ page, testUser }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)
    await page.waitForURL(POST_LOGIN_URL, { timeout: 10000 })
  })

  authTest('playground page loads without crashing', async ({ page }) => {
    await page.goto(adminPath('/playground'))
    await page.waitForLoadState('networkidle')

    // Page should render — no React error boundary should be triggered
    const errorBoundary = page.locator('text=Something went wrong')
    await expect(errorBoundary).not.toBeVisible()

    // The playground page root element should exist
    await expect(page.locator('body')).toBeVisible()
  })

  authTest(
    'playground SchemaList renders without TypeError',
    async ({ page, authenticatedApiClient, cleanup }) => {
      // Create a schema so schemas.map() executes (the crash only triggers with schemas present)
      const schemaName = `TestPlayground${Date.now()}`
      await authenticatedApiClient.createPlaygroundSchema({
        name: schemaName,
        fields: [
          {
            name: 'title',
            displayName: 'Title',
            type: 'text' as const,
            tsType: 'string',
            prop: { required: true },
            ui: { type: 'text', label: 'Title' },
            validations: [],
          },
        ],
      })
      cleanup.register(() => authenticatedApiClient.deletePlaygroundSchema(schemaName))

      await page.goto(adminPath('/playground'))
      await page.waitForLoadState('networkidle')

      // No React error boundary should be triggered
      await expect(page.locator('text=Something went wrong')).not.toBeVisible()
      await expect(page.locator('text=TypeError')).not.toBeVisible()
    },
  )
})
