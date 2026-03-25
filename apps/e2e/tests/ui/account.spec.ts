import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { POST_LOGIN_URL } from '../../src/helpers/admin-paths'
import { AccountPage } from '../../src/page-objects/account.page'
import { DashboardPage } from '../../src/page-objects/dashboard.page'
import { LoginPage } from '../../src/page-objects/login.page'

authTest.describe('Account Page UI', () => {
  authTest.beforeEach(async ({ page, testUser }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)
    await page.waitForURL(POST_LOGIN_URL, { timeout: 10000 })
  })

  authTest('can navigate to account page', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.navigateToAccount()

    const accountPage = new AccountPage(page)
    await accountPage.expectLoaded()
  })

  authTest('displays user profile information', async ({ page }) => {
    const accountPage = new AccountPage(page)
    await accountPage.goto()

    await expect(accountPage.avatar).toBeVisible({ timeout: 5000 })
    await expect(accountPage.nameInput).toBeVisible()
    await expect(accountPage.emailInput).toBeVisible()
  })

  authTest('can view profile tab', async ({ page }) => {
    const accountPage = new AccountPage(page)
    await accountPage.goto()

    await accountPage.switchToProfileTab()
    await expect(accountPage.nameInput).toBeVisible()
    await expect(accountPage.emailInput).toBeVisible()
  })

  authTest('can view security tab', async ({ page }) => {
    const accountPage = new AccountPage(page)
    await accountPage.goto()

    await accountPage.switchToSecurityTab()
    await expect(accountPage.currentPasswordInput).toBeVisible()
    await expect(accountPage.newPasswordInput).toBeVisible()
    await expect(accountPage.confirmPasswordInput).toBeVisible()
  })

  authTest('can update profile information', async ({ page }) => {
    const accountPage = new AccountPage(page)
    await accountPage.goto()

    const newName = `Updated Name ${Date.now()}`
    await accountPage.updateProfile({ name: newName })

    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/profile updated|saved successfully/i).first()).toBeVisible({
      timeout: 5000,
    })
  })

  authTest('password change requires matching confirmation', async ({ page }) => {
    const accountPage = new AccountPage(page)
    await accountPage.goto()

    await accountPage.switchToSecurityTab()

    await accountPage.currentPasswordInput.fill('AnyPassword123!')
    await accountPage.newPasswordInput.fill('NewPassword123!')
    await accountPage.confirmPasswordInput.fill('DifferentPassword123!')

    await accountPage.changePasswordButton.click()
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/do not match|mismatch|error/i)).toBeVisible({
      timeout: 3000,
    })
  })

  authTest('profile email field is read-only', async ({ page }) => {
    const accountPage = new AccountPage(page)
    await accountPage.goto()

    await accountPage.switchToProfileTab()

    // Email field is disabled — users cannot change their email
    const emailInput = accountPage.emailInput
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toBeDisabled()
  })

  authTest('account page is accessible after navigation', async ({ page }) => {
    const accountPage = new AccountPage(page)
    await accountPage.goto()

    const dashboard = new DashboardPage(page)
    await dashboard.goto()

    await dashboard.navigateToAccount()
    await accountPage.expectLoaded()
  })
})
