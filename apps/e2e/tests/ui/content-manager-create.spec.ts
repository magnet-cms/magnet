import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { POST_LOGIN_URL, adminPath } from '../../src/helpers/admin-paths'
import { LoginPage } from '../../src/page-objects/login.page'

/**
 * Regression tests for content-manager create page bugs:
 * - useBlocker must be used within a data router (App.tsx used BrowserRouter)
 * - Lexical error #14 from duplicate lexical instances (0.39.0 vs 0.42.0)
 */
authTest.describe('Content Manager Create Page', () => {
  authTest.beforeEach(async ({ page, testUser }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)
    await page.waitForURL(POST_LOGIN_URL, { timeout: 10000 })
  })

  authTest('should load create page without crashing (no useBlocker error)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      errors.push(err.message)
    })

    await page.goto(adminPath('/content-manager/veterinarian/new'))
    await page.waitForLoadState('domcontentloaded')

    // The page should not crash — form or loading skeleton should be visible
    const pageContent = page.locator('body')
    await expect(pageContent).toBeVisible({ timeout: 5000 })

    // Should not have a useBlocker invariant error
    const blockerErrors = errors.filter((e) =>
      e.includes('useBlocker must be used within a data router'),
    )
    expect(blockerErrors).toHaveLength(0)
  })

  authTest('should render content-manager create form without Lexical errors', async ({ page }) => {
    const lexicalErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Lexical error')) {
        lexicalErrors.push(msg.text())
      }
    })

    await page.goto(adminPath('/content-manager/veterinarian/new'))
    // Wait for schema to load and form to render
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // No Lexical errors should appear
    expect(lexicalErrors).toHaveLength(0)
  })
})
