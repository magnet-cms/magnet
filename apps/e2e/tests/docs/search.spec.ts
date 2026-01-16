import { expect, test } from '@playwright/test'
import { DocsPage } from '../../src/page-objects/docs.page'

test.describe('Documentation Search', () => {
	test.beforeEach(async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs')
	})

	test('opens search dialog with click', async ({ page }) => {
		const docsPage = new DocsPage(page)

		await docsPage.openSearch()
		await expect(docsPage.searchDialog).toBeVisible()
	})

	test('opens search dialog with keyboard shortcut', async ({ page }) => {
		const docsPage = new DocsPage(page)

		// Try Cmd+K (Mac) or Ctrl+K (Windows/Linux)
		await page.keyboard.press('Control+k')
		await expect(docsPage.searchDialog).toBeVisible({ timeout: 5000 })
	})

	test('closes search dialog with Escape', async ({ page }) => {
		const docsPage = new DocsPage(page)

		await docsPage.openSearch()
		await expect(docsPage.searchDialog).toBeVisible()

		await page.keyboard.press('Escape')
		await expect(docsPage.searchDialog).not.toBeVisible()
	})

	test('shows search input placeholder', async ({ page }) => {
		const docsPage = new DocsPage(page)

		await docsPage.openSearch()
		await expect(docsPage.searchInput).toBeVisible()
		await expect(docsPage.searchInput).toHaveAttribute('placeholder', /Search/i)
	})

	test.skip('returns results for valid query', async ({ page }) => {
		const docsPage = new DocsPage(page)

		await docsPage.search('installation')
		await docsPage.expectSearchResults()
	})

	test.skip('navigates to result on click', async ({ page }) => {
		const docsPage = new DocsPage(page)

		await docsPage.search('MagnetModule')

		// Click first result
		await page.locator('[data-search-result], [role="option"]').first().click()

		// Should navigate to a docs page
		await expect(page).toHaveURL(/\/docs\//)
	})
})
