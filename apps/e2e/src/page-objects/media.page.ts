import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

import { adminPath } from '../helpers/admin-paths'

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
    this.uploadButton = page.getByRole('button', { name: /upload assets/i })
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
    await this.page.goto(adminPath('/media-library'))
  }

  async expectLoaded() {
    await expect(this.mainContent).toBeVisible()
    // Page should show the Media Library heading
    await expect(this.pageHeader).toBeVisible()
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

  async editMetadata(
    itemIndex: number,
    metadata: {
      alt?: string
      tags?: string[]
      folder?: string
    },
  ) {
    await this.selectMediaItem(itemIndex)
    // Wait for detail view or edit dialog
    await this.page.waitForTimeout(500)

    if (metadata.alt) {
      const altInput = this.page.getByLabel(/alt|description/i)
      await altInput.fill(metadata.alt)
    }

    if (metadata.tags) {
      const tagsInput = this.page.getByLabel(/tags/i)
      await tagsInput.fill(metadata.tags.join(','))
    }

    if (metadata.folder) {
      const folderInput = this.page.getByLabel(/folder/i)
      await folderInput.fill(metadata.folder)
    }

    // Save changes
    const saveButton = this.page.getByRole('button', { name: /save/i })
    if (await saveButton.isVisible()) {
      await saveButton.click()
    }
  }

  async deleteMedia(itemIndex: number) {
    await this.selectMediaItem(itemIndex)
    await this.page.waitForTimeout(500)

    const deleteButton = this.page.getByRole('button', { name: /delete/i })
    await deleteButton.click()

    // Confirm deletion if dialog appears
    const confirmButton = this.page.getByRole('button', {
      name: /confirm|delete|yes/i,
    })
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }
  }

  async filterByFolder(folderName: string) {
    await this.folderFilter.click()
    await this.page.getByText(folderName).click()
    await this.page.waitForTimeout(500)
  }

  async searchMedia(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500)
  }

  async uploadFileWithMetadata(
    filePath: string,
    metadata?: { folder?: string; tags?: string[]; alt?: string },
  ) {
    await this.uploadButton.click()
    const fileChooserPromise = this.page.waitForEvent('filechooser')
    await this.uploadZone.click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(filePath)

    // Fill metadata if provided
    if (metadata) {
      if (metadata.folder) {
        const folderInput = this.page.getByLabel(/folder/i)
        await folderInput.fill(metadata.folder)
      }

      if (metadata.tags) {
        const tagsInput = this.page.getByLabel(/tags/i)
        await tagsInput.fill(metadata.tags.join(','))
      }

      if (metadata.alt) {
        const altInput = this.page.getByLabel(/alt/i)
        await altInput.fill(metadata.alt)
      }
    }

    // Confirm upload
    const uploadConfirmButton = this.page.getByRole('button', {
      name: /upload|confirm/i,
    })
    if (await uploadConfirmButton.isVisible()) {
      await uploadConfirmButton.click()
    }

    // Wait for upload to complete
    await this.page.waitForTimeout(2000)
  }
}
