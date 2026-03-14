import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class ConfigureViewDrawer {
	readonly page: Page
	readonly drawer: Locator
	readonly applyButton: Locator
	readonly cancelButton: Locator
	readonly resetButton: Locator

	constructor(page: Page) {
		this.page = page
		this.drawer = page.getByRole('dialog')
		this.applyButton = page.getByRole('button', { name: /apply/i })
		this.cancelButton = page.getByRole('button', { name: /cancel/i })
		this.resetButton = page.getByRole('button', { name: /reset to defaults/i })
	}

	async open() {
		await this.page.getByRole('button', { name: /configure view/i }).click()
		await expect(this.drawer).toBeVisible({ timeout: 5000 })
	}

	async close() {
		await this.cancelButton.click()
		await expect(this.drawer).not.toBeVisible({ timeout: 5000 })
	}

	async apply() {
		await this.applyButton.click()
		await expect(this.drawer).not.toBeVisible({ timeout: 5000 })
	}

	async toggleColumn(columnName: string) {
		const row = this.drawer.locator(`text=${columnName}`).locator('../..')
		const toggle = row.getByRole('switch')
		await toggle.click()
	}

	async isColumnToggleChecked(columnName: string): Promise<boolean> {
		const row = this.drawer.locator(`text=${columnName}`).locator('../..')
		const toggle = row.getByRole('switch')
		return toggle.isChecked()
	}

	async setPageSize(size: number) {
		const pageSizeSelect = this.drawer.getByRole('combobox').first()
		await pageSizeSelect.click()
		await this.page.getByRole('option', { name: `${size} rows` }).click()
	}

	async reset() {
		await this.resetButton.click()
	}
}
