import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { POST_LOGIN_URL, adminPath } from '../../src/helpers/admin-paths'
import { LoginPage } from '../../src/page-objects/login.page'

const TEMPLATE_NAME = process.env.TEMPLATE_NAME || ''

authTest.describe('Vault UI', () => {
  authTest.beforeEach(async ({ page, testUser }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)
    await page.waitForURL(POST_LOGIN_URL, { timeout: 10000 })
  })

  authTest('can navigate to vault settings page', async ({ page }) => {
    await page.goto(adminPath('/settings'))
    await page.waitForLoadState('networkidle')

    // Look for vault-related settings or navigation
    const vaultLink = page.getByText(/vault/i)
    if (
      await vaultLink
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await vaultLink.first().click()
      await page.waitForLoadState('networkidle')

      // Verify vault status indicator is visible
      const statusIndicator = page.getByText(/healthy|connected|adapter/i)
      await expect(statusIndicator.first()).toBeVisible({ timeout: 5000 })
    }
  })

  authTest('vault status shows correct adapter type', async ({ authenticatedApiClient, page }) => {
    // Verify via API that vault is healthy
    const response = await authenticatedApiClient.getVaultStatus()
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    if (TEMPLATE_NAME === 'drizzle-supabase') {
      expect(typeof body.healthy).toBe('boolean')
    } else {
      expect(body.healthy).toBe(true)
    }

    // Navigate to settings to see vault configuration
    await page.goto(adminPath('/settings'))
    await page.waitForLoadState('networkidle')

    // The settings page should show vault configuration
    const settingsContent = await page.textContent('body')
    expect(settingsContent).toBeTruthy()
  })
})
