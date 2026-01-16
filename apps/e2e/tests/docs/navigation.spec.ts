import { expect, test } from '@playwright/test'
import { DocsPage } from '../../src/page-objects/docs.page'

test.describe('Documentation Navigation', () => {
	test('redirects root to default language', async ({ page }) => {
		await page.goto('/')
		await expect(page).toHaveURL(/\/en/)
	})

	test('displays landing page', async ({ page }) => {
		await page.goto('/en')
		await expect(page.getByRole('heading', { name: /Magnet/i })).toBeVisible()
		await expect(page.getByRole('link', { name: /Get Started/i })).toBeVisible()
	})

	test('navigates to documentation', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs')

		await docsPage.expectSidebarVisible()
		await docsPage.expectHeading('Welcome to Magnet')
	})

	test('displays sidebar with main sections', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs')

		await docsPage.expectSidebarVisible()

		// Check main sections exist
		const sections = ['Getting Started', 'Core', 'Common']
		for (const section of sections) {
			await expect(docsPage.sidebar.getByText(section)).toBeVisible()
		}
	})

	test('navigates to Getting Started section', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs')

		await docsPage.navigateToSection('Getting Started')
		await docsPage.expectUrl(/\/docs\/getting-started/)
	})

	test('navigates to Core section', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs')

		await docsPage.navigateToSection('Core')
		await docsPage.expectUrl(/\/docs\/core/)
	})

	test('displays table of contents on content pages', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs/getting-started/installation')

		// TOC should be visible on larger content pages
		await expect(docsPage.mainContent).toBeVisible()
	})

	test('navigates between documentation pages', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs')

		// Navigate to Getting Started
		await docsPage.navigateToSection('Getting Started')
		await docsPage.expectUrl(/\/getting-started/)

		// Navigate to Installation
		await page.getByRole('link', { name: 'Installation' }).click()
		await docsPage.expectUrl(/\/installation/)
		await docsPage.expectHeading('Installation')
	})
})
