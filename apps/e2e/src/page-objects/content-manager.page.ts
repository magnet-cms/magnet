import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { adminPath } from '../helpers/admin-paths'

export class ContentManagerPage {
	readonly page: Page
	readonly schemaList: Locator
	readonly itemList: Locator
	readonly createButton: Locator
	readonly searchInput: Locator
	readonly table: Locator

	constructor(page: Page) {
		this.page = page
		this.schemaList = page.getByTestId('schema-list')
		this.itemList = page.getByTestId('item-list')
		this.createButton = page.getByRole('button', { name: /create|add|new/i })
		this.searchInput = page.getByPlaceholder(/search/i)
		this.table = page.getByRole('table')
	}

	async goto() {
		await this.page.goto(adminPath('/content-manager'))
	}

	async gotoSchema(schemaName: string) {
		await this.page.goto(adminPath(`/content-manager/${schemaName}`))
	}

	async gotoItem(schemaName: string, itemId: string) {
		await this.page.goto(adminPath(`/content-manager/${schemaName}/${itemId}`))
	}

	async selectSchema(schemaName: string) {
		await this.page
			.getByRole('link', { name: new RegExp(schemaName, 'i') })
			.click()
	}

	async expectSchemaListVisible() {
		await expect(this.schemaList).toBeVisible()
	}

	async expectItemListVisible() {
		await expect(this.table).toBeVisible()
	}

	async createNewItem() {
		await this.createButton.click()
	}

	async searchItems(query: string) {
		await this.searchInput.fill(query)
		await this.page.waitForTimeout(300)
	}

	async createItem() {
		await this.createButton.click()
		// Wait for navigation to create/edit page
		await this.page.waitForURL(/create|edit/, { timeout: 5000 })
	}

	async editItem(itemId: string) {
		// Click on item row or edit button
		await this.page
			.getByRole('row')
			.filter({ hasText: itemId })
			.getByRole('button', { name: /edit/i })
			.or(this.page.getByRole('link', { name: new RegExp(itemId, 'i') }))
			.first()
			.click()
		await this.page.waitForURL(/edit|view/, { timeout: 5000 })
	}

	async deleteItem(itemId: string) {
		// Find delete button for the item
		const row = this.page.getByRole('row').filter({ hasText: itemId })
		await row.getByRole('button', { name: /delete/i }).click()
		// Confirm deletion if dialog appears
		const confirmButton = this.page.getByRole('button', {
			name: /confirm|delete|yes/i,
		})
		if (await confirmButton.isVisible()) {
			await confirmButton.click()
		}
	}

	async filterItems(filterType: string, value: string) {
		// Generic filter method - may need adjustment based on actual UI
		const filterInput = this.page
			.getByLabel(filterType)
			.or(this.page.locator(`[data-testid="${filterType}-filter"]`))
		await filterInput.fill(value)
		await this.page.waitForTimeout(300)
	}

	async expectItemInList(itemName: string) {
		await expect(this.page.getByText(itemName)).toBeVisible()
	}

	async expectItemNotInList(itemName: string) {
		await expect(this.page.getByText(itemName)).not.toBeVisible()
	}

	async getItemCount(): Promise<number> {
		return this.table.getByRole('row').count()
	}
}
