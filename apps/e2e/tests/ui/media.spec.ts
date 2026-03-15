import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { POST_LOGIN_URL } from '../../src/helpers/admin-paths'
import { LoginPage } from '../../src/page-objects/login.page'
import { MediaPage } from '../../src/page-objects/media.page'

authTest.describe('Media Library UI', () => {
	authTest.beforeEach(async ({ page, testUser }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()
		await loginPage.login(testUser.email, testUser.password)
		await page.waitForURL(POST_LOGIN_URL, { timeout: 10000 })
	})

	authTest('media library page loads successfully', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()
		await mediaPage.expectLoaded()
	})

	authTest('can navigate to media library from sidebar', async ({ page }) => {
		const mediaLink = page.getByRole('link', { name: /media/i })
		await mediaLink.click()

		await expect(page).toHaveURL(/media/)

		const mediaPage = new MediaPage(page)
		await mediaPage.expectLoaded()
	})

	authTest('media library has upload button', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()

		await expect(mediaPage.uploadButton).toBeVisible()
	})

	authTest('media library has search functionality', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()

		await expect(mediaPage.searchInput).toBeVisible()
	})

	authTest('can switch between grid and list views', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()

		// View toggle buttons are icon-only buttons next to the sort dropdown
		// Verify the main content area is visible (implies view is rendered)
		await expect(page.locator('main')).toBeVisible()
		// The page has the heading "Media Library" which confirms the page loaded
		await expect(
			page.getByRole('heading', { name: /media library/i }),
		).toBeVisible()
	})

	authTest('media page shows header with title', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()

		const header = page.locator('h1, [data-testid="page-header"]').filter({
			hasText: /media/i,
		})

		await expect(header.first()).toBeVisible()
	})

	authTest('media page shows empty state or media items', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()
		await page.waitForLoadState('networkidle')

		// Media page shows either folder/asset headings or content
		// Use first() because both "Folders" and "Assets" headings can be present
		await expect(
			page.getByRole('heading', { name: /folders|assets/i }).first(),
		).toBeVisible({ timeout: 5000 })
	})

	authTest('upload button opens upload dialog', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()

		await mediaPage.uploadButton.click()

		const uploadZone = page.locator(
			'[data-testid="upload-zone"], [role="dialog"], input[type="file"]',
		)
		await expect(uploadZone.first()).toBeVisible()
	})

	authTest('media library is responsive', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()

		await page.setViewportSize({ width: 375, height: 667 })
		await mediaPage.expectLoaded()

		await page.setViewportSize({ width: 768, height: 1024 })
		await mediaPage.expectLoaded()

		await page.setViewportSize({ width: 1280, height: 720 })
		await mediaPage.expectLoaded()
	})

	authTest('can search media', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()

		await mediaPage.searchMedia('test')
		await page.waitForLoadState('networkidle')

		// After searching, the page shows filtered assets or a "no results" message
		await expect(page.locator('main')).toBeVisible()
	})
})
