import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class DocsPage {
	readonly page: Page
	readonly sidebar: Locator
	readonly searchButton: Locator
	readonly searchDialog: Locator
	readonly searchInput: Locator
	readonly tocNav: Locator
	readonly mainContent: Locator
	readonly languageSwitcher: Locator

	constructor(page: Page) {
		this.page = page
		this.sidebar = page.locator('aside[data-sidebar], nav[data-sidebar]')
		this.searchButton = page.locator(
			'button:has-text("Search"), [data-search-trigger], kbd:has-text("K")',
		)
		this.searchDialog = page.locator('[role="dialog"], [data-search-dialog]')
		this.searchInput = page.locator(
			'input[placeholder*="Search"], [data-search-input]',
		)
		this.tocNav = page.locator('nav[data-toc], aside:has-text("On this page")')
		this.mainContent = page.locator('main, article')
		this.languageSwitcher = page.locator(
			'[data-language-switcher], button:has-text("English"), button:has-text("Português")',
		)
	}

	async goto(path = '/en/docs') {
		await this.page.goto(path)
	}

	async expectSidebarVisible() {
		await expect(this.sidebar).toBeVisible()
	}

	async openSearch() {
		await this.searchButton.first().click()
	}

	async search(query: string) {
		await this.openSearch()
		await expect(this.searchDialog).toBeVisible({ timeout: 5000 })
		await this.searchInput.fill(query)
	}

	async expectSearchResults() {
		await expect(
			this.page.locator('[data-search-result], [role="option"]'),
		).toBeVisible({ timeout: 5000 })
	}

	async navigateToSection(section: string) {
		await this.sidebar.getByRole('link', { name: section }).click()
	}

	async expectHeading(text: string) {
		await expect(
			this.mainContent.getByRole('heading', { name: text }),
		).toBeVisible()
	}

	async expectUrl(pattern: RegExp) {
		await expect(this.page).toHaveURL(pattern)
	}

	async expectTitle(title: string) {
		await expect(this.page).toHaveTitle(new RegExp(title))
	}

	async switchLanguage(language: 'en' | 'pt-BR') {
		await this.languageSwitcher.click()
		const label = language === 'en' ? 'English' : 'Português'
		await this.page.getByRole('menuitem', { name: label }).click()
	}
}
