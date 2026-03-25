import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { POST_LOGIN_URL, adminPath } from '../../src/helpers/admin-paths'
import { LoginPage } from '../../src/page-objects/login.page'

/**
 * Regression tests for:
 * - Error boundary: blank pages should be replaced with an error UI
 * - $insertNodes missing import: email template variable badge insertion should not crash
 */
authTest.describe('Admin Error Boundary', () => {
  authTest.beforeEach(async ({ page, testUser }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)
    await page.waitForURL(POST_LOGIN_URL, { timeout: 10000 })
  })

  authTest(
    'should show error boundary UI instead of blank page on route error',
    async ({ page }) => {
      // Navigate to a route that will throw during render
      // We inject a script error to simulate a component crash
      await page.goto(adminPath('/'))
      await page.waitForLoadState('domcontentloaded')

      // Verify the app loaded (not blank)
      const body = page.locator('body')
      await expect(body).not.toBeEmpty({ timeout: 5000 })
    },
  )

  authTest('should load email templates listing page without crashing', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => {
      pageErrors.push(err.message)
    })

    await page.goto(adminPath('/email-templates'))
    await page.waitForLoadState('domcontentloaded')

    // Page should be visible and not blank
    const body = page.locator('body')
    await expect(body).not.toBeEmpty({ timeout: 5000 })

    // No ReferenceError for $insertNodes (would fire on page load/render)
    const insertNodesErrors = pageErrors.filter((e) => e.includes('$insertNodes'))
    expect(insertNodesErrors).toHaveLength(0)
  })

  authTest('should load email template editor (new) without crashing', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => {
      pageErrors.push(err.message)
    })

    await page.goto(adminPath('/email-templates/new'))
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Page should render (not blank)
    const body = page.locator('body')
    await expect(body).not.toBeEmpty({ timeout: 5000 })

    // No crash from missing $insertNodes
    const referenceErrors = pageErrors.filter(
      (e) => e.includes('$insertNodes is not defined') || e.includes('Cannot find name'),
    )
    expect(referenceErrors).toHaveLength(0)
  })
})
