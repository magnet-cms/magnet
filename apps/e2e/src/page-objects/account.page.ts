import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

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
		this.profileTab = page.getByRole('tab', { name: /profile/i })
		this.securityTab = page.getByRole('tab', { name: /security/i })
		this.nameInput = page.getByLabel(/name/i)
		this.emailInput = page.getByLabel(/email/i)
		this.currentPasswordInput = page.getByLabel(/current password/i)
		this.newPasswordInput = page.getByLabel(/new password/i)
		this.confirmPasswordInput = page.getByLabel(/confirm.*password/i)
		this.saveProfileButton = page.getByRole('button', { name: /save changes/i })
		this.changePasswordButton = page.getByRole('button', {
			name: /change password/i,
		})
		this.avatar = page.locator('[data-testid="avatar"], .avatar, [role="img"]')
	}

	async goto() {
		await this.page.goto('/admin/settings/profile')
		await this.expectLoaded()
	}

	async expectLoaded() {
		await expect(this.page.getByText(/account|profile/i)).toBeVisible()
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
		await expect(
			this.page.getByText(/profile updated|saved successfully/i),
		).toBeVisible({ timeout: 5000 })
	}

	async expectPasswordChanged() {
		// Wait for success toast
		await expect(
			this.page.getByText(/password changed|saved successfully/i),
		).toBeVisible({ timeout: 5000 })
	}

	async getProfileData() {
		await this.switchToProfileTab()
		return {
			name: await this.nameInput.inputValue(),
			email: await this.emailInput.inputValue(),
		}
	}
}
