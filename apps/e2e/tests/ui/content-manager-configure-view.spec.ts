import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { ConfigureViewDrawer } from '../../src/page-objects/configure-view-drawer'
import { LoginPage } from '../../src/page-objects/login.page'

const SCHEMA = 'veterinarian'

authTest.describe('Content Manager — Configure View', () => {
	authTest.beforeEach(async ({ page, testUser }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()
		await loginPage.login(testUser.email, testUser.password)
		await page.waitForURL(/\/admin/, { timeout: 10000 })
		await page.goto(`/content-manager/${SCHEMA}`)
		await page.waitForLoadState('networkidle')
		// Clear any saved view config so tests start from a clean state
		await page.evaluate(
			(key) => localStorage.removeItem(key),
			`magnet:view-config:${SCHEMA}`,
		)
		await page.reload()
		await page.waitForLoadState('networkidle')
	})

	authTest(
		'Configure View button opens the right-side drawer',
		async ({ page }) => {
			const drawer = new ConfigureViewDrawer(page)
			await drawer.open()

			// Drawer is visible with expected content
			await expect(drawer.drawer).toBeVisible()
			await expect(drawer.drawer.getByText(/configure view/i)).toBeVisible()
			await expect(drawer.drawer.getByText(/columns/i)).toBeVisible()
		},
	)

	authTest(
		'drawer lists schema properties as toggleable columns',
		async ({ page }) => {
			const drawer = new ConfigureViewDrawer(page)
			await drawer.open()

			// Each column row has a toggle switch
			const switches = drawer.drawer.getByRole('switch')
			const count = await switches.count()
			expect(count).toBeGreaterThan(0)
		},
	)

	authTest(
		'toggling a column off hides it from the DataTable after apply',
		async ({ page }) => {
			const drawer = new ConfigureViewDrawer(page)
			await drawer.open()

			// Find the first schema-property switch and read its label
			const firstSwitch = drawer.drawer.getByRole('switch').first()
			const switchContainer = firstSwitch.locator('../..')
			const columnLabel = await switchContainer
				.locator('label')
				.first()
				.textContent()

			// Toggle it off
			await firstSwitch.click()
			await expect(firstSwitch).not.toBeChecked()

			// Apply
			await drawer.apply()
			await expect(drawer.drawer).not.toBeVisible()

			// The column header should no longer be in the table
			if (columnLabel) {
				const table = page.getByRole('table')
				await expect(
					table.getByRole('columnheader', {
						name: new RegExp(columnLabel.trim(), 'i'),
					}),
				).not.toBeVisible()
			}
		},
	)

	authTest(
		'page size preference persists after page reload',
		async ({ page }) => {
			const drawer = new ConfigureViewDrawer(page)
			await drawer.open()

			// Change page size to 5
			await drawer.setPageSize(5)
			await drawer.apply()

			// Reload the page
			await page.reload()
			await page.waitForLoadState('networkidle')

			// Re-open drawer and verify page size was saved
			await drawer.open()
			const pageSizeSelect = drawer.drawer.getByRole('combobox').first()
			await expect(pageSizeSelect).toContainText('5')
		},
	)

	authTest('Cancel button closes drawer without saving', async ({ page }) => {
		const drawer = new ConfigureViewDrawer(page)
		await drawer.open()

		// Toggle first column off
		const firstSwitch = drawer.drawer.getByRole('switch').first()
		const wasChecked = await firstSwitch.isChecked()
		await firstSwitch.click()

		// Cancel
		await drawer.close()
		await expect(drawer.drawer).not.toBeVisible()

		// Re-open and verify toggle is back to its original state
		await drawer.open()
		const firstSwitchAgain = drawer.drawer.getByRole('switch').first()
		expect(await firstSwitchAgain.isChecked()).toBe(wasChecked)
	})

	authTest('Reset button restores defaults', async ({ page }) => {
		const drawer = new ConfigureViewDrawer(page)
		await drawer.open()

		// Change page size
		await drawer.setPageSize(5)

		// Reset
		await drawer.reset()

		// Page size should revert to 10
		const pageSizeSelect = drawer.drawer.getByRole('combobox').first()
		await expect(pageSizeSelect).toContainText('10')
	})
})
