import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { LoginPage } from '../../src/page-objects/login.page'

authTest.describe('Content Manager Home Page', () => {
	authTest.beforeEach(async ({ page, testUser }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()
		await loginPage.login(testUser.email, testUser.password)
		await page.waitForURL(/\/admin\/(?!auth)/, { timeout: 10000 })
	})

	authTest(
		'should display collection cards on content-manager index',
		async ({ page }) => {
			await page.goto('/admin/content-manager')
			await page.waitForLoadState('networkidle')

			// Verify the page header
			await expect(
				page.getByRole('heading', { name: /content manager/i }),
			).toBeVisible({ timeout: 5000 })

			// Verify collection cards are rendered (links to /content-manager/{schema})
			const collectionLinks = page.locator('a[href*="/content-manager/"]')
			await expect(collectionLinks.first()).toBeVisible({ timeout: 5000 })

			const cardCount = await collectionLinks.count()
			expect(cardCount).toBeGreaterThan(0)
		},
	)

	authTest(
		'should navigate to schema listing when clicking a collection card',
		async ({ page }) => {
			await page.goto('/admin/content-manager')
			await page.waitForLoadState('networkidle')

			// Get the first collection card link
			const firstCard = page.locator('a[href*="/content-manager/"]').first()
			await expect(firstCard).toBeVisible({ timeout: 5000 })

			// Get the href to know which schema we're navigating to
			const href = await firstCard.getAttribute('href')
			expect(href).toBeTruthy()

			// Click the card
			await firstCard.click()
			await page.waitForLoadState('networkidle')

			// Verify navigation happened to the schema listing
			await expect(page).toHaveURL(/content-manager\/.+/)
		},
	)

	authTest(
		'should not show media schema in collection cards',
		async ({ page }) => {
			await page.goto('/admin/content-manager')
			await page.waitForLoadState('networkidle')

			// Wait for the page to fully render (heading visible = data loaded)
			await expect(
				page.getByRole('heading', { name: /content manager/i }),
			).toBeVisible({ timeout: 5000 })

			// Verify no card links to the media schema
			const mediaCard = page.locator('a[href*="/content-manager/media"]')
			await expect(mediaCard).toHaveCount(0)
		},
	)
})
