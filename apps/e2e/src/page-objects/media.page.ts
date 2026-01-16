import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class MediaPage {
	readonly page: Page
	readonly mainContent: Locator
	readonly mediaGrid: Locator
	readonly uploadButton: Locator
	readonly uploadZone: Locator
	readonly searchInput: Locator
	readonly folderFilter: Locator
	readonly gridViewButton: Locator
	readonly listViewButton: Locator
	readonly mediaItems: Locator
	readonly emptyState: Locator
	readonly pageHeader: Locator

	constructor(page: Page) {
		this.page = page
		this.mainContent = page.locator('main')
		this.mediaGrid = page.locator('[data-testid="media-grid"]')
		this.uploadButton = page.getByRole('button', { name: /upload/i })
		this.uploadZone = page.locator('[data-testid="upload-zone"]')
		this.searchInput = page.getByPlaceholder(/search/i)
		this.folderFilter = page.locator('[data-testid="folder-filter"]')
		this.gridViewButton = page.getByRole('button', { name: /grid/i })
		this.listViewButton = page.getByRole('button', { name: /list/i })
		this.mediaItems = page.locator('[data-testid="media-item"]')
		this.emptyState = page.locator('[data-testid="empty-state"]')
		this.pageHeader = page.locator('h1, [data-testid="page-header"]')
	}

	async goto() {
		await this.page.goto('/media')
	}

	async expectLoaded() {
		await expect(this.mainContent).toBeVisible()
		// Page should have either media items or empty state
		await expect(
			this.mediaItems.first().or(this.emptyState).or(this.pageHeader),
		).toBeVisible()
	}

	async uploadFile(filePath: string) {
		// Click upload button to open dialog
		await this.uploadButton.click()

		// Use file chooser
		const fileChooserPromise = this.page.waitForEvent('filechooser')
		await this.uploadZone.click()
		const fileChooser = await fileChooserPromise
		await fileChooser.setFiles(filePath)
	}

	async searchMedia(query: string) {
		await this.searchInput.fill(query)
		// Wait for debounce
		await this.page.waitForTimeout(500)
	}

	async switchToGridView() {
		await this.gridViewButton.click()
	}

	async switchToListView() {
		await this.listViewButton.click()
	}

	async selectMediaItem(index: number) {
		await this.mediaItems.nth(index).click()
	}

	async getMediaItemCount(): Promise<number> {
		return this.mediaItems.count()
	}

	async expectMediaItem(filename: string) {
		const item = this.page.locator(`[data-testid="media-item"]`, {
			hasText: filename,
		})
		await expect(item).toBeVisible()
	}

	async expectEmptyState() {
		await expect(this.emptyState).toBeVisible()
	}
}
