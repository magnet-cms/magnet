import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

import { adminPath } from '../helpers/admin-paths'

export class SettingsPage {
  readonly page: Page
  readonly settingsList: Locator
  readonly saveButton: Locator
  readonly form: Locator

  constructor(page: Page) {
    this.page = page
    this.settingsList = page.locator('[data-testid="settings-list"]')
    this.saveButton = page.getByRole('button', { name: /save/i })
    this.form = page.locator('form')
  }

  async goto() {
    await this.page.goto(adminPath('/settings'))
    await this.expectLoaded()
  }

  async gotoGroup(groupName: string) {
    await this.page.goto(adminPath(`/settings/${groupName}`))
    await this.expectGroupLoaded()
  }

  async expectLoaded() {
    // Use breadcrumb link or main content heading to verify settings page is loaded
    await expect(
      this.page
        .locator('main')
        .getByText(/settings/i)
        .first(),
    ).toBeVisible()
  }

  async expectGroupLoaded() {
    await expect(this.form.or(this.page.getByText(/loading/i))).toBeVisible()
  }

  async editSetting(fieldName: string, value: string | number | boolean) {
    const field = this.page.getByLabel(fieldName).or(this.page.locator(`[name="${fieldName}"]`))

    await field.fill(String(value))
  }

  async saveSettings() {
    await this.saveButton.click()
    // Wait for save to complete
    await this.page.waitForTimeout(500)
  }

  async expectSettingsSaved() {
    await expect(this.page.getByText(/settings saved|saved successfully/i)).toBeVisible({
      timeout: 5000,
    })
  }

  async getSettingValue(fieldName: string): Promise<string> {
    const field = this.page.getByLabel(fieldName).or(this.page.locator(`[name="${fieldName}"]`))
    return field.inputValue()
  }
}
