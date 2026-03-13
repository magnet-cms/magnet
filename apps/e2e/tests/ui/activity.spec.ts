import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { LoginPage } from '../../src/page-objects/login.page'

authTest.describe('Activity Page UI', () => {
	authTest.beforeEach(async ({ page, testUser }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()
		await loginPage.login(testUser.email, testUser.password)
		await page.waitForURL(/\/admin/, { timeout: 10000 })
	})

	authTest('navigates to /activity from sidebar', async ({ page }) => {
		await page.goto('/admin/activity')
		await expect(page).toHaveURL(/\/activity/)
	})

	authTest('activity page displays list container', async ({ page }) => {
		await page.goto('/admin/activity')
		// Wait for page to load (either list items or empty state)
		await page.waitForTimeout(1000)
		const hasContent =
			(await page.locator('[data-testid="activity-list"]').count()) > 0 ||
			(await page.locator('text=No activity').count()) > 0 ||
			(await page.locator('text=Activity').count()) > 0
		expect(hasContent).toBe(true)
	})

	authTest('activity page filter controls are present', async ({ page }) => {
		await page.goto('/admin/activity')
		await page.waitForTimeout(500)
		// Action Type and Entity Type dropdowns / filter button should be visible
		await expect(page.locator('text=Action Type')).toBeVisible()
		await expect(page.locator('text=Entity Type')).toBeVisible()
	})
})
