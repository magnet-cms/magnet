import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class LoginPage {
	readonly page: Page
	readonly emailInput: Locator
	readonly passwordInput: Locator
	readonly verifyPasswordInput: Locator
	readonly submitButton: Locator
	readonly errorMessage: Locator

	constructor(page: Page) {
		this.page = page
		// The login form uses custom label elements (not HTML <label>), so
		// getByLabel won't work. Use placeholder text for email and positional
		// matching for password.
		this.emailInput = page.getByPlaceholder(/email|jane@example/i)
		this.passwordInput = page
			.getByRole('textbox')
			.nth(1)
			.or(page.getByLabel('Password', { exact: true }))
		this.verifyPasswordInput = page
			.getByPlaceholder(/verify|confirm/i)
			.or(page.getByLabel(/verify password/i))
		this.submitButton = page.getByRole('button', {
			name: /sign in|create account|submit|login|setup/i,
		})
		// Sonner uses data-sonner-toast with data-type="error"
		this.errorMessage = page
			.locator('[data-sonner-toast][data-type="error"]')
			.or(page.locator('[data-type="error"]'))
			.or(page.getByRole('alert'))
	}

	async goto() {
		await this.page.goto('/admin/auth')
	}

	async login(email: string, password: string) {
		await this.emailInput.fill(email)
		await this.passwordInput.fill(password)
		await this.submitButton.click()
	}

	async setup(email: string, password: string) {
		await this.emailInput.fill(email)
		await this.passwordInput.fill(password)
		// Setup form has verify password field
		if (await this.verifyPasswordInput.isVisible()) {
			await this.verifyPasswordInput.fill(password)
		}
		await this.submitButton.click()
	}

	async expectLoginForm() {
		await expect(this.emailInput).toBeVisible()
		await expect(this.passwordInput).toBeVisible()
	}

	async expectError(message?: string | RegExp) {
		await expect(this.errorMessage).toBeVisible()
		if (message) {
			await expect(this.errorMessage).toHaveText(message)
		}
	}
}
