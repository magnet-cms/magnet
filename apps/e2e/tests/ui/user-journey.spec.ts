import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { POST_LOGIN_URL, adminPath } from '../../src/helpers/admin-paths'
import { AccountPage } from '../../src/page-objects/account.page'
import { DashboardPage } from '../../src/page-objects/dashboard.page'
import { LoginPage } from '../../src/page-objects/login.page'
import { MediaPage } from '../../src/page-objects/media.page'
import { SettingsPage } from '../../src/page-objects/settings.page'

authTest.describe('Complete User Journey', () => {
  authTest.beforeEach(async ({ page, testUser }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)
    await page.waitForURL(POST_LOGIN_URL, { timeout: 10000 })
  })

  authTest('can login and view dashboard', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.expectLoaded()
  })

  authTest('can logout and log back in', async ({ page, testUser }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()

    await dashboard.logout()
    await page.waitForURL(/auth/, { timeout: 5000 })

    const loginPage = new LoginPage(page)
    await loginPage.login(testUser.email, testUser.password)
    await page.waitForURL(POST_LOGIN_URL, { timeout: 10000 })
    await dashboard.expectLoaded()
  })

  authTest('can navigate to media library', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.navigateToMedia()

    const mediaPage = new MediaPage(page)
    await mediaPage.expectLoaded()
  })

  authTest('can navigate to settings', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.navigateToSettings()

    const settingsPage = new SettingsPage(page)
    await settingsPage.expectLoaded()
  })

  authTest('can navigate to account management', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.navigateToAccount()

    const accountPage = new AccountPage(page)
    await accountPage.expectLoaded()
  })

  authTest('can update profile and verify change', async ({ page, testUser }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.navigateToAccount()

    const accountPage = new AccountPage(page)
    const newName = `Updated ${testUser.email.split('@')[0]}-${Date.now()}`
    await accountPage.updateProfile({ name: newName })
    await accountPage.expectProfileUpdated()
  })

  authTest('after logout, protected routes redirect to login', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.logout()

    await page.goto(adminPath('/'))
    await page.waitForURL(/auth/, { timeout: 5000 })

    const loginPage = new LoginPage(page)
    await loginPage.expectLoginForm()
  })

  authTest('sidebar navigation is accessible throughout session', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.expectLoaded()

    await expect(dashboard.sidebar).toBeVisible({ timeout: 10_000 })

    const sidebarItems = await dashboard.getSidebarItems()
    expect(sidebarItems.length).toBeGreaterThan(0)
  })
})
