import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class DashboardPage {
	readonly page: Page
	readonly sidebar: Locator
	readonly contentManagerLink: Locator
	readonly settingsLink: Locator
	readonly userMenuButton: Locator
	readonly logoutMenuItem: Locator
	readonly accountMenuItem: Locator
	readonly mainContent: Locator

	constructor(page: Page) {
		this.page = page
		this.sidebar = page.locator('[data-testid="sidebar"], aside, nav')
		this.contentManagerLink = page.getByRole('link', {
			name: /content manager/i,
		})
		// Settings is a collapsible button, not a link
		this.settingsLink = page.getByRole('button', { name: /settings/i })
		// User menu is the sidebar button that shows user's name/email with avatar
		this.userMenuButton = page
			.locator('button')
			.filter({ hasText: /@/ })
			.first()
		this.logoutMenuItem = page.getByRole('menuitem', { name: /log out/i })
		this.accountMenuItem = page.getByRole('menuitem', { name: /account/i })
		this.mainContent = page.locator('main')
	}

	async goto() {
		await this.page.goto('/admin')
	}

	async expectLoaded() {
		await expect(this.mainContent).toBeVisible()
	}

	async navigateToContentManager() {
		await this.contentManagerLink.click()
		await this.page.waitForURL('**/content-manager**')
	}

	async navigateToSettings() {
		// Settings is a collapsible menu, click to expand then click first settings group
		await this.settingsLink.click()
		// Wait for the submenu to appear and click first available settings link
		const firstSettingsLink = this.page.locator('a[href*="/settings/"]').first()
		await firstSettingsLink.click()
		await this.page.waitForURL('**/settings/**')
	}

	async logout() {
		await this.userMenuButton.click()
		await this.logoutMenuItem.click()
		await this.page.waitForURL('**/auth**')
	}

	async navigateToMedia() {
		await this.page.getByRole('link', { name: /media/i }).click()
		await this.page.waitForURL('**/media**')
	}

	async navigateToAccount() {
		await this.userMenuButton.click()
		await this.accountMenuItem.click()
		await this.page.waitForURL(/settings\/profile|account/, { timeout: 5000 })
	}

	async navigateToHome() {
		await this.page.getByRole('link', { name: /home|dashboard/i }).click()
		// Admin app is mounted at /admin; dashboard home is /admin or /admin/
		await this.page.waitForURL(/\/admin\/?$/)
	}

	async expectUserMenuVisible() {
		await expect(this.userMenuButton).toBeVisible()
	}

	async getSidebarItems(): Promise<string[]> {
		const items = await this.sidebar.getByRole('link').allTextContents()
		return items
	}
}
