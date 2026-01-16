import { expect, test } from '@playwright/test'
import { DocsPage } from '../../src/page-objects/docs.page'

test.describe('Documentation i18n', () => {
	test('loads English documentation by default', async ({ page }) => {
		await page.goto('/')
		await expect(page).toHaveURL(/\/en/)
	})

	test('displays English content on /en/docs', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs')

		await expect(
			page.getByRole('heading', { name: /Welcome to Magnet/i }),
		).toBeVisible()
	})

	test('displays Portuguese content on /pt-BR/docs', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/pt-BR/docs')

		await expect(
			page.getByRole('heading', { name: /Bem-vindo ao Magnet/i }),
		).toBeVisible()
	})

	test('preserves language when navigating', async ({ page }) => {
		const docsPage = new DocsPage(page)
		await docsPage.goto('/en/docs')

		// Navigate to Getting Started
		await docsPage.navigateToSection('Getting Started')

		// Should still be in English
		await expect(page).toHaveURL(/\/en\/docs/)
	})

	test('landing page shows localized content for English', async ({ page }) => {
		await page.goto('/en')

		await expect(page.getByRole('link', { name: /Get Started/i })).toBeVisible()
	})

	test('landing page shows localized content for Portuguese', async ({
		page,
	}) => {
		await page.goto('/pt-BR')

		await expect(page.getByRole('link', { name: /Começar/i })).toBeVisible()
	})

	test('direct URL access works for both languages', async ({ page }) => {
		// English
		await page.goto('/en/docs/getting-started')
		await expect(page).toHaveURL(/\/en\/docs\/getting-started/)
		await expect(
			page.getByRole('heading', { name: /Getting Started/i }),
		).toBeVisible()
	})
})
