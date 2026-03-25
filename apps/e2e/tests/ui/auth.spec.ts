import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { test as baseTest } from '../../src/fixtures/base.fixture'
import { POST_LOGIN_URL } from '../../src/helpers/admin-paths'
import { DashboardPage } from '../../src/page-objects/dashboard.page'
import { LoginPage } from '../../src/page-objects/login.page'

baseTest.describe('Authentication UI — unauthenticated', () => {
  baseTest('displays login form', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.expectLoginForm()
  })

  baseTest('shows error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('invalid@example.com', 'wrongpassword')
    await loginPage.expectError()
  })

  baseTest('auto-redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/admin/content-manager')
    await page.waitForURL(/auth/, { timeout: 5000 })
  })
})

authTest.describe('Authentication UI — login flow', () => {
  authTest('can login with valid credentials', async ({ page, testUser }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)

    await page.waitForURL(POST_LOGIN_URL, { timeout: 10000 })

    const dashboard = new DashboardPage(page)
    await dashboard.expectLoaded()
  })
})

authTest.describe('Logout Flow', () => {
  authTest.beforeEach(async ({ page, testUser }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)
    await page.waitForURL(POST_LOGIN_URL, { timeout: 10000 })
  })

  authTest('logout button is visible when authenticated', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await expect(dashboard.userMenuButton).toBeVisible()
  })

  authTest('logout clears session and redirects to login', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const dashboard = new DashboardPage(page)

    await dashboard.logout()
    await page.waitForURL(/auth/, { timeout: 5000 })
    await loginPage.expectLoginForm()
  })

  authTest('cannot access protected routes after logout', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.logout()

    await page.goto('/admin/content-manager')
    await page.waitForURL(/auth/, { timeout: 5000 })
  })
})

authTest.describe('Session Management', () => {
  authTest.beforeEach(async ({ page, testUser }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)
    await page.waitForURL(POST_LOGIN_URL, { timeout: 10000 })
  })

  authTest('token persists across page reloads', async ({ page }) => {
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page).not.toHaveURL(/auth/)
    const dashboard = new DashboardPage(page)
    await dashboard.expectLoaded()
  })
})
