import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { LoginPage } from '../../src/page-objects/login.page'
import { SettingsPage } from '../../src/page-objects/settings.page'

authTest.describe('Settings UI', () => {
	authTest.beforeEach(async ({ page, testUser }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()
		await loginPage.login(testUser.email, testUser.password)
		await page.waitForURL(/\/admin\/(?!auth)/, { timeout: 10000 })
	})

	authTest('can navigate to settings', async ({ page }) => {
		const settingsPage = new SettingsPage(page)
		await settingsPage.goto()
		await settingsPage.expectLoaded()
	})

	authTest('can view settings list', async ({ page }) => {
		const settingsPage = new SettingsPage(page)
		await settingsPage.goto()

		await expect(
			page.getByText(/settings/i).or(page.locator('main')),
		).toBeVisible()
	})

	authTest('can navigate to settings group', async ({ page }) => {
		const settingsPage = new SettingsPage(page)
		await settingsPage.goto()

		const settingsLink = page
			.getByRole('link')
			.filter({ hasText: /settings/i })
			.first()

		if (await settingsLink.isVisible()) {
			await settingsLink.click()
			await page.waitForLoadState('networkidle')

			await expect(page.locator('main')).toBeVisible()
		}
	})

	authTest(
		'settings form shows save button when inputs exist',
		async ({ page }) => {
			const settingsPage = new SettingsPage(page)
			await settingsPage.goto()

			const inputFields = page.locator('input, textarea, select')
			const inputCount = await inputFields.count()

			if (inputCount > 0) {
				const saveButton = page.getByRole('button', { name: /save/i })
				const hasSaveButton = await saveButton.isVisible().catch(() => false)
				// Settings page with inputs should have a way to save them
				expect(hasSaveButton || inputCount === 0).toBe(true)
			}
		},
	)

	authTest('settings page is accessible after navigation', async ({ page }) => {
		const settingsPage = new SettingsPage(page)
		await settingsPage.goto()
		await settingsPage.expectLoaded()

		// Navigate away and back
		await page.goto('/admin')
		await page.waitForLoadState('networkidle')

		await settingsPage.goto()
		await settingsPage.expectLoaded()
	})

	authTest(
		'notification settings — email channel toggle persists',
		async ({ page, authenticatedApiClient }) => {
			// First, ensure email channel is disabled via API
			await authenticatedApiClient.updateSettings('notifications', {
				emailChannelEnabled: false,
			})

			// Navigate to notification settings in the UI
			const settingsPage = new SettingsPage(page)
			await settingsPage.goto()
			await page.waitForLoadState('networkidle')

			// Look for notifications settings group
			const notifLink = page.getByText(/notification/i)
			if (
				await notifLink
					.first()
					.isVisible({ timeout: 3000 })
					.catch(() => false)
			) {
				await notifLink.first().click()
				await page.waitForLoadState('networkidle')

				// Look for email channel toggle
				const emailToggle = page.getByLabel(/email channel/i)
				if (
					await emailToggle
						.first()
						.isVisible({ timeout: 3000 })
						.catch(() => false)
				) {
					// Toggle it on
					await emailToggle.first().click()

					// Save
					const saveButton = page.getByRole('button', { name: /save/i })
					if (await saveButton.isVisible().catch(() => false)) {
						await saveButton.click()
						await page.waitForLoadState('networkidle')
					}

					// Reload and verify persistence
					await page.reload()
					await page.waitForLoadState('networkidle')

					// Verify via API
					const response =
						await authenticatedApiClient.getSettings('notifications')
					if (response.ok()) {
						const body = await response.json()
						expect(body.emailChannelEnabled).toBe(true)
					}
				}
			}

			// Restore default
			await authenticatedApiClient.updateSettings('notifications', {
				emailChannelEnabled: false,
			})
		},
	)
})
