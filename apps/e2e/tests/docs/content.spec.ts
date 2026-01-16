import { expect, test } from '@playwright/test'
import { DocsPage } from '../../src/page-objects/docs.page'

test.describe('Documentation Content', () => {
	test('renders markdown content correctly', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs')

		// Check that content renders
		await expect(docsPage.mainContent).toBeVisible()

		// Check for headings
		await expect(
			docsPage.mainContent.getByRole('heading', { level: 1 }),
		).toBeVisible()
	})

	test('renders code blocks', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs/getting-started/installation')

		// Check for code blocks
		await expect(page.locator('pre code')).toBeVisible()
	})

	test('renders links correctly', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs')

		// Check for navigation links
		const links = docsPage.mainContent.getByRole('link')
		await expect(links.first()).toBeVisible()
	})

	test('renders Cards component', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs')

		// Cards should be rendered on the home page
		await expect(page.locator('a[href*="/docs/getting-started"]')).toBeVisible()
	})

	test('renders tables correctly', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs')

		// Check for tables (Package Overview table)
		const table = page.locator('table')
		if ((await table.count()) > 0) {
			await expect(table.first()).toBeVisible()
		}
	})

	test('page has correct metadata', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs')

		// Check page title
		await expect(page).toHaveTitle(/Magnet/)
	})

	test('renders Steps component', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs/getting-started')

		// Steps should be visible on Getting Started page
		// This tests the MDX component integration
		await expect(docsPage.mainContent).toContainText(/Install|Create|Configure/)
	})

	test('external links open correctly', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs')

		// GitHub link should be present
		await expect(
			page.getByRole('link', { name: /GitHub/i }).first(),
		).toBeVisible()
	})
})
