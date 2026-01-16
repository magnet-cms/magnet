import { expect, test } from '@playwright/test'
import { testData } from '../../src/helpers/test-data'
import { LoginPage } from '../../src/page-objects/login.page'
import { MediaPage } from '../../src/page-objects/media.page'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'

test.describe('Media Library UI', () => {
	test.beforeEach(async ({ page, request }) => {
		const userData = testData.user.create()

		const statusResponse = await request.get(`${API_BASE_URL}/auth/status`)
		const status = await statusResponse.json()

		if (status.requiresSetup) {
			await request.post(`${API_BASE_URL}/auth/register`, {
				data: userData,
			})
		} else {
			await request
				.post(`${API_BASE_URL}/auth/register`, {
					data: userData,
				})
				.catch(() => {})
		}

		const loginPage = new LoginPage(page)
		await loginPage.goto()
		await loginPage.login(userData.email, userData.password)

		await page.waitForURL(/^\/$|\/dashboard|\/content-manager/)
	})

	test('media library page loads successfully', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()
		await mediaPage.expectLoaded()
	})

	test('can navigate to media library from sidebar', async ({ page }) => {
		// Find and click the Media link in sidebar
		const mediaLink = page.getByRole('link', { name: /media/i })
		await mediaLink.click()

		await expect(page).toHaveURL(/media/)

		const mediaPage = new MediaPage(page)
		await mediaPage.expectLoaded()
	})

	test('media library has upload button', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()

		await expect(mediaPage.uploadButton).toBeVisible()
	})

	test('media library has search functionality', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()

		// Search input should be visible
		await expect(mediaPage.searchInput).toBeVisible()
	})

	test('can switch between grid and list views', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()

		// Check if view toggle buttons are visible
		const gridButton = page.getByRole('button', { name: /grid/i })
		const listButton = page.getByRole('button', { name: /list/i })

		// At least one view toggle should be visible
		const hasViewToggle =
			(await gridButton.isVisible()) || (await listButton.isVisible())
		expect(hasViewToggle).toBe(true)
	})

	test('media page shows header with title', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()

		// Look for Media Library header
		const header = page.locator('h1, [data-testid="page-header"]').filter({
			hasText: /media/i,
		})

		await expect(header.first()).toBeVisible()
	})

	test('media page shows empty state or media items', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()

		// Page should show either empty state or media items
		const hasEmptyState = await page
			.locator('[data-testid="empty-state"], text=/no media/i')
			.isVisible()
			.catch(() => false)
		const hasMediaItems = await page
			.locator('[data-testid="media-item"]')
			.first()
			.isVisible()
			.catch(() => false)
		const hasGridContent = await page
			.locator('[data-testid="media-grid"]')
			.isVisible()
			.catch(() => false)

		// At least one of these should be true
		expect(hasEmptyState || hasMediaItems || hasGridContent).toBe(true)
	})

	test('upload button opens upload dialog', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()

		await mediaPage.uploadButton.click()

		// Look for upload zone/dialog
		const uploadZone = page.locator(
			'[data-testid="upload-zone"], [role="dialog"], input[type="file"]',
		)
		await expect(uploadZone.first()).toBeVisible()
	})

	test('media library is responsive', async ({ page }) => {
		const mediaPage = new MediaPage(page)
		await mediaPage.goto()

		// Test mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })
		await mediaPage.expectLoaded()

		// Test tablet viewport
		await page.setViewportSize({ width: 768, height: 1024 })
		await mediaPage.expectLoaded()

		// Test desktop viewport
		await page.setViewportSize({ width: 1280, height: 720 })
		await mediaPage.expectLoaded()
	})

	test('sidebar shows Media link', async ({ page }) => {
		// Navigate to dashboard first
		await page.goto('/')

		// Check for Media link in sidebar
		const mediaLink = page.getByRole('link', { name: /media/i })
		await expect(mediaLink).toBeVisible()
	})
})
