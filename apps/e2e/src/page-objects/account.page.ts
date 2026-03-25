import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

import { adminPath } from '../helpers/admin-paths'

export class AccountPage {
  readonly page: Page
  readonly profileTab: Locator
  readonly securityTab: Locator
  readonly nameInput: Locator
  readonly emailInput: Locator
  readonly currentPasswordInput: Locator
  readonly newPasswordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly saveProfileButton: Locator
  readonly changePasswordButton: Locator
  readonly avatar: Locator

  constructor(page: Page) {
    this.page = page
    // Profile page uses plain <button> elements for tabs, not role="tab"
    this.profileTab = page.getByRole('button', { name: /personal/i })
    this.securityTab = page.getByRole('button', { name: /security/i })
    // Label text is "Full Name" and "Email Address" in the profile form
    this.nameInput = page.getByLabel(/full name|name/i)
    this.emailInput = page.getByLabel(/email address|email/i)
    this.currentPasswordInput = page.getByLabel(/current password/i)
    this.newPasswordInput = page.getByLabel(/new password/i)
    this.confirmPasswordInput = page.getByLabel(/confirm.*password/i)
    this.saveProfileButton = page.getByRole('button', { name: /save changes/i })
    // Button text is "Update Password", not "Change Password"
    this.changePasswordButton = page.getByRole('button', {
      name: /update password|change password/i,
    })
    // Profile photo section: the avatar is a button with user initials
    this.avatar = page.getByRole('heading', { name: 'Profile Photo' })
  }

  async goto() {
    await this.page.goto(adminPath('/settings/profile'))
    await this.expectLoaded()
  }

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible()
  }

  async switchToProfileTab() {
    await this.profileTab.click()
  }

  async switchToSecurityTab() {
    await this.securityTab.click()
  }

  async updateProfile(data: { name?: string; email?: string }) {
    await this.switchToProfileTab()

    if (data.name) {
      await this.nameInput.fill(data.name)
    }

    if (data.email) {
      await this.emailInput.fill(data.email)
    }

    await this.saveProfileButton.click()
  }

  async changePassword(data: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }) {
    await this.switchToSecurityTab()

    await this.currentPasswordInput.fill(data.currentPassword)
    await this.newPasswordInput.fill(data.newPassword)
    await this.confirmPasswordInput.fill(data.confirmPassword)

    await this.changePasswordButton.click()
  }

  async expectProfileUpdated() {
    // Wait for success toast or updated values
    await expect(this.page.getByText(/profile updated|saved successfully/i)).toBeVisible({
      timeout: 5000,
    })
  }

  async expectPasswordChanged() {
    // Wait for success toast
    await expect(this.page.getByText(/password changed|saved successfully/i)).toBeVisible({
      timeout: 5000,
    })
  }

  async getProfileData() {
    await this.switchToProfileTab()
    return {
      name: await this.nameInput.inputValue(),
      email: await this.emailInput.inputValue(),
    }
  }
}
