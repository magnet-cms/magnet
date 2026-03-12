import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { DashboardPage } from '../../src/page-objects/dashboard.page'
import { LoginPage } from '../../src/page-objects/login.page'

authTest.describe('Dashboard UI', () => {
	authTest.beforeEach(async ({ page, testUser }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()
		await loginPage.login(testUser.email, testUser.password)
		await page.waitForURL(/\/admin/, { timeout: 10000 })
	})

	authTest('dashboard loads successfully', async ({ page }) => {
		const dashboard = new DashboardPage(page)
		await dashboard.goto()
		await dashboard.expectLoaded()
	})

	authTest('can navigate to content manager', async ({ page }) => {
		const dashboard = new DashboardPage(page)
		await dashboard.goto()
		await dashboard.navigateToContentManager()

		await expect(page).toHaveURL(/content-manager/)
	})

	authTest('can navigate to settings', async ({ page }) => {
		const dashboard = new DashboardPage(page)
		await dashboard.goto()
		await dashboard.navigateToSettings()

		await expect(page).toHaveURL(/settings/)
	})

	authTest('can navigate to media library', async ({ page }) => {
		const dashboard = new DashboardPage(page)
		await dashboard.goto()
		await dashboard.navigateToMedia()

		await expect(page).toHaveURL(/media/)
	})

	authTest('can navigate to account page', async ({ page }) => {
		const dashboard = new DashboardPage(page)
		await dashboard.goto()
		await dashboard.navigateToAccount()

		await expect(page).toHaveURL(/account/)
	})

	authTest('sidebar navigation is visible', async ({ page }) => {
		const dashboard = new DashboardPage(page)
		await dashboard.goto()

		await expect(dashboard.sidebar).toBeVisible()
	})

	authTest('user menu is visible when authenticated', async ({ page }) => {
		const dashboard = new DashboardPage(page)
		await dashboard.goto()

		await dashboard.expectUserMenuVisible()
	})

	authTest('can access all main sections from sidebar', async ({ page }) => {
		const dashboard = new DashboardPage(page)
		await dashboard.goto()

		const sidebarItems = await dashboard.getSidebarItems()
		expect(sidebarItems.length).toBeGreaterThan(0)

		await dashboard.navigateToContentManager()
		await expect(page).toHaveURL(/content-manager/)

		await dashboard.goto()
		await dashboard.navigateToMedia()
		await expect(page).toHaveURL(/media/)
	})

	authTest('dashboard shows statistics or overview', async ({ page }) => {
		const dashboard = new DashboardPage(page)
		await dashboard.goto()

		await expect(dashboard.mainContent).toBeVisible()

		const hasContent =
			(await page.getByRole('heading').count()) > 0 ||
			(await page.locator('[data-testid="stat"], .card, .grid').count()) > 0

		expect(hasContent).toBe(true)
	})

	authTest('dashboard is accessible after page reload', async ({ page }) => {
		const dashboard = new DashboardPage(page)
		await dashboard.goto()
		await dashboard.expectLoaded()

		await page.reload()
		await page.waitForLoadState('networkidle')

		await expect(page).toHaveURL(/\/admin/)
		await dashboard.expectLoaded()
	})
})
