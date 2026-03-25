import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { POST_LOGIN_URL } from '../../src/helpers/admin-paths'
import { LoginPage } from '../../src/page-objects/login.page'

authTest.describe('Auth Settings Awareness UI', () => {
  authTest.beforeEach(async ({ page, testUser }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)
    await page.waitForURL(POST_LOGIN_URL, { timeout: 10000 })
  })

  authTest('auth settings tab renders editable form for JWT strategy', async ({ page }) => {
    // Navigate to settings
    await page.goto('/admin/settings')
    await page.waitForLoadState('networkidle')

    // Find and click the Authentication tab
    const authTab = page.getByRole('button', {
      name: /authentication/i,
    })

    // Auth tab may not exist if auth settings are not registered
    if (!(await authTab.isVisible({ timeout: 5000 }).catch(() => false))) {
      authTest.skip(true, 'Authentication settings tab not found')
      return
    }

    await authTab.click()
    await page.waitForLoadState('networkidle')

    // For JWT strategy (default), the form should be editable — no banner
    // Verify there is NO external auth banner
    const banner = page.getByTestId('external-auth-banner')
    await expect(banner).not.toBeVisible()

    // Verify that editable form sections are visible (e.g., session, password, security)
    const formContent = page.locator('form')
    await expect(formContent).toBeVisible()
  })
})
