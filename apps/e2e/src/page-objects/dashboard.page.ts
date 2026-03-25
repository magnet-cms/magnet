import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

import { ADMIN_PREFIX, adminPath } from '../helpers/admin-paths'

export class DashboardPage {
  readonly page: Page
  readonly sidebar: Locator
  readonly contentManagerButton: Locator
  readonly settingsLink: Locator
  readonly userMenuButton: Locator
  readonly logoutMenuItem: Locator
  readonly accountMenuItem: Locator
  readonly mainContent: Locator

  constructor(page: Page) {
    this.page = page
    // Sidebar uses shadcn/ui Sidebar component rendered as div[data-slot="sidebar"]
    this.sidebar = page.locator('[data-slot="sidebar"]').first()
    // Content Manager is a collapsible button (has sub-items for each schema)
    this.contentManagerButton = page.getByRole('button', {
      name: /content manager/i,
    })
    // Settings is a link to /settings
    this.settingsLink = page.getByRole('link', { name: /^settings$/i })
    // User menu is the sidebar button that shows user's name/email with avatar
    this.userMenuButton = this.sidebar.getByRole('button').filter({ hasText: /@/ }).first()
    this.logoutMenuItem = page.getByRole('menuitem', { name: /log out/i })
    this.accountMenuItem = page.getByRole('menuitem', { name: /account/i })
    this.mainContent = page.locator('main')
  }

  async goto() {
    await this.page.goto(adminPath('/'))
  }

  async expectLoaded() {
    await expect(this.mainContent).toBeVisible()
  }

  async navigateToContentManager() {
    // Content Manager is a collapsible button; click to expand, then click a schema link
    await this.contentManagerButton.click()
    // Click the first sub-item link under Content Manager
    const firstSchemaLink = this.page.locator('[data-slot="sidebar-menu-sub-button"]').first()
    await firstSchemaLink.click()
    await this.page.waitForURL('**/content-manager/**')
  }

  async navigateToSettings() {
    await this.settingsLink.click()
    await this.page.waitForURL('**/settings**')
  }

  async logout() {
    await this.userMenuButton.click()
    await this.logoutMenuItem.click()
    await this.page.waitForURL('**/auth**')
  }

  async navigateToMedia() {
    await this.page.getByRole('link', { name: /media library/i }).click()
    await this.page.waitForURL('**/media-library**')
  }

  async navigateToAccount() {
    await this.userMenuButton.click()
    await this.accountMenuItem.click()
    // /account redirects to /settings/profile
    await this.page.waitForURL(/settings\/profile/, { timeout: 5000 })
  }

  async navigateToHome() {
    await this.page.getByRole('link', { name: /^dashboard$/i }).click()
    // Dashboard home is at ADMIN_PREFIX root (e.g., /admin/ or /)
    const pattern = ADMIN_PREFIX ? `${ADMIN_PREFIX.replace('/', '\\/')}\\/?$` : '\\/$'
    await this.page.waitForURL(new RegExp(pattern))
  }

  async expectUserMenuVisible() {
    await expect(this.userMenuButton).toBeVisible()
  }

  async getSidebarItems(): Promise<string[]> {
    // Wait for sidebar to be visible first
    await expect(this.sidebar).toBeVisible()
    // Get all navigation link and button text from the sidebar
    const links = await this.sidebar.getByRole('link').allTextContents()
    const buttons = await this.sidebar.getByRole('button').allTextContents()
    return [...links, ...buttons]
  }
}
