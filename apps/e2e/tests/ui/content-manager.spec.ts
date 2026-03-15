import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { testData } from '../../src/helpers/test-data'
import { LoginPage } from '../../src/page-objects/login.page'

authTest.describe('Content Manager', () => {
	authTest.beforeEach(async ({ page, testUser }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()
		await loginPage.login(testUser.email, testUser.password)
		await page.waitForURL(/\/admin\/(?!auth)/, { timeout: 10000 })
	})

	// ==========================================
	// SECTION 1: Basic Navigation Tests
	// ==========================================
	authTest.describe('Navigation', () => {
		authTest('should list available schemas in sidebar', async ({ page }) => {
			await page.goto('/admin/content-manager/veterinarian')
			await page.waitForLoadState('networkidle')

			// Expand Content Manager if collapsed
			const contentManagerButton = page.getByRole('button', {
				name: /content manager/i,
			})
			if (await contentManagerButton.isVisible()) {
				const isExpanded = await contentManagerButton.getAttribute('data-state')
				if (isExpanded !== 'open') {
					await contentManagerButton.click()
				}
			}

			const schemaLinks = page.locator('a[href*="/admin/content-manager/"]')
			await expect(schemaLinks.first()).toBeVisible({ timeout: 5000 })

			const schemaCount = await schemaLinks.count()
			expect(schemaCount).toBeGreaterThan(0)
		})

		authTest('should navigate between different schemas', async ({ page }) => {
			await page.goto('/admin/content-manager/veterinarian')
			await page.waitForLoadState('networkidle')
			await expect(
				page.getByRole('heading', { name: /veterinarian/i }),
			).toBeVisible({ timeout: 5000 })

			await page.goto('/admin/content-manager/owner')
			await page.waitForLoadState('networkidle')
			await expect(page.getByRole('heading', { name: /owner/i })).toBeVisible({
				timeout: 5000,
			})

			await page.goto('/admin/content-manager/cat')
			await page.waitForLoadState('networkidle')
			await expect(page.getByRole('heading', { name: /cat/i })).toBeVisible({
				timeout: 5000,
			})
		})

		authTest(
			'should display table with correct structure',
			async ({ page }) => {
				await page.goto('/admin/content-manager/veterinarian')
				await page.waitForLoadState('networkidle')

				const table = page.getByRole('table')
				await expect(table).toBeVisible({ timeout: 5000 })

				const headers = table.getByRole('columnheader')
				const headerCount = await headers.count()
				expect(headerCount).toBeGreaterThan(0)

				await expect(headers.filter({ hasText: /id/i }).first()).toBeVisible()
			},
		)
	})

	// ==========================================
	// SECTION 2: Create Content via API
	// ==========================================
	authTest.describe('Create Veterinarian', () => {
		authTest(
			'should create a new veterinarian via API and navigate to edit',
			async ({ page, authenticatedApiClient, cleanup }) => {
				const vetData = testData.veterinarian.create()

				const response = await authenticatedApiClient.createContent(
					'veterinarian',
					vetData,
				)
				expect(response.ok()).toBeTruthy()
				const created = await response.json()
				const documentId = created.documentId as string

				cleanup.trackContent(authenticatedApiClient, 'veterinarian', documentId)

				await page.goto(`/admin/content-manager/veterinarian/${documentId}`)
				await page.waitForLoadState('networkidle')

				await expect(
					page.getByRole('heading', { name: /veterinarian/i }),
				).toBeVisible({ timeout: 5000 })

				const nameInput = page.getByLabel(/name/i).first()
				await expect(nameInput).toHaveValue(vetData.name, { timeout: 5000 })
			},
		)

		authTest(
			'should edit veterinarian from list using first row',
			async ({ page, authenticatedApiClient, cleanup }) => {
				// Ensure at least one record exists
				const vetData = testData.veterinarian.create()
				const response = await authenticatedApiClient.createContent(
					'veterinarian',
					vetData,
				)
				const created = await response.json()
				cleanup.trackContent(
					authenticatedApiClient,
					'veterinarian',
					created.documentId as string,
				)

				await page.goto('/admin/content-manager/veterinarian')
				await page.waitForLoadState('networkidle')

				const dataRows = page.locator('tbody tr')
				await expect(dataRows.first()).toBeVisible({ timeout: 5000 })

				const firstRow = dataRows.first()
				const actionsButton = firstRow.locator('button').last()
				await actionsButton.click()

				const editOption = page.getByRole('menuitem', { name: /edit/i })
				await editOption.click()

				await page.waitForURL(/\/content-manager\/veterinarian\/[^/]+$/, {
					timeout: 10000,
				})

				await expect(
					page.getByRole('heading', { name: /veterinarian/i }),
				).toBeVisible({ timeout: 5000 })
			},
		)
	})

	authTest.describe('Create Owner', () => {
		authTest(
			'should create a new owner via API and navigate to edit',
			async ({ page, authenticatedApiClient, cleanup }) => {
				const ownerData = testData.owner.create()

				const response = await authenticatedApiClient.createContent(
					'owner',
					ownerData,
				)
				expect(response.ok()).toBeTruthy()
				const created = await response.json()
				const documentId = created.documentId as string

				cleanup.trackContent(authenticatedApiClient, 'owner', documentId)

				await page.goto(`/admin/content-manager/owner/${documentId}`)
				await page.waitForLoadState('networkidle')

				await expect(page.getByRole('heading', { name: /owner/i })).toBeVisible(
					{ timeout: 5000 },
				)

				const nameInput = page.getByLabel(/name/i).first()
				await expect(nameInput).toHaveValue(ownerData.name, { timeout: 5000 })
			},
		)
	})

	// ==========================================
	// SECTION 3: Edit Content
	// ==========================================
	authTest.describe('Edit Content', () => {
		authTest(
			'should show tabs for Edit, Versions, and API on edit page',
			async ({ page, authenticatedApiClient, cleanup }) => {
				const vetData = testData.veterinarian.create()
				const response = await authenticatedApiClient.createContent(
					'veterinarian',
					vetData,
				)
				const created = await response.json()
				cleanup.trackContent(
					authenticatedApiClient,
					'veterinarian',
					created.documentId as string,
				)

				await page.goto(
					`/admin/content-manager/veterinarian/${created.documentId}`,
				)
				await page.waitForLoadState('networkidle')

				const editTab = page.getByRole('tab', { name: /^edit$/i })
				const versionsTab = page.getByRole('tab', { name: /versions/i })
				const apiTab = page.getByRole('tab', { name: /api/i })

				await expect(editTab).toBeVisible({ timeout: 5000 })
				await expect(versionsTab).toBeVisible({ timeout: 5000 })
				await expect(apiTab).toBeVisible({ timeout: 5000 })
			},
		)
	})

	// ==========================================
	// SECTION 4: Versioning & Publishing
	// ==========================================
	authTest.describe('Versioning & Publishing', () => {
		authTest(
			'should show publish button for draft content',
			async ({ page, authenticatedApiClient, cleanup }) => {
				const vetData = testData.veterinarian.create()
				const response = await authenticatedApiClient.createContent(
					'veterinarian',
					vetData,
				)
				const created = await response.json()
				const docId = created.documentId as string
				cleanup.trackContent(authenticatedApiClient, 'veterinarian', docId)

				await page.goto(`/admin/content-manager/veterinarian/${docId}`)
				await page.waitForLoadState('networkidle')

				const publishButton = page.getByRole('button', { name: /publish/i })
				await expect(publishButton).toBeVisible({ timeout: 5000 })
			},
		)

		authTest(
			'should publish veterinarian content',
			async ({ page, authenticatedApiClient, cleanup }) => {
				const vetData = testData.veterinarian.create()
				const response = await authenticatedApiClient.createContent(
					'veterinarian',
					vetData,
				)
				const created = await response.json()
				const docId = created.documentId as string
				cleanup.trackContent(authenticatedApiClient, 'veterinarian', docId)

				await page.goto(`/admin/content-manager/veterinarian/${docId}`)
				await page.waitForLoadState('networkidle')

				const publishButton = page.getByRole('button', { name: /publish/i })
				await expect(publishButton).toBeVisible({ timeout: 5000 })
				await publishButton.click()

				const successToast = page.getByText('Content published')
				await expect(successToast).toBeVisible({ timeout: 5000 })
			},
		)

		authTest(
			'should navigate to versions tab and show version history',
			async ({ page, authenticatedApiClient, cleanup }) => {
				const vetData = testData.veterinarian.create()
				const response = await authenticatedApiClient.createContent(
					'veterinarian',
					vetData,
				)
				const created = await response.json()
				const docId = created.documentId as string
				cleanup.trackContent(authenticatedApiClient, 'veterinarian', docId)

				await page.goto(`/admin/content-manager/veterinarian/${docId}/versions`)
				await page.waitForLoadState('networkidle')

				await expect(page.getByText(/version history/i)).toBeVisible({
					timeout: 5000,
				})
			},
		)
	})

	// ==========================================
	// SECTION 5: Row Actions
	// ==========================================
	authTest.describe('Row Actions', () => {
		authTest(
			'should show row actions menu with Edit, Duplicate, Versions, Delete',
			async ({ page, authenticatedApiClient, cleanup }) => {
				const vetData = testData.veterinarian.create()
				const response = await authenticatedApiClient.createContent(
					'veterinarian',
					vetData,
				)
				const created = await response.json()
				cleanup.trackContent(
					authenticatedApiClient,
					'veterinarian',
					created.documentId as string,
				)

				await page.goto('/admin/content-manager/veterinarian')
				await page.waitForLoadState('networkidle')

				const dataRows = page.locator('tbody tr')
				await expect(dataRows.first()).toBeVisible({ timeout: 5000 })

				const firstRow = dataRows.first()
				const actionsButton = firstRow.locator('button').last()

				await actionsButton.click()

				const editOption = page.getByRole('menuitem', { name: /edit/i })
				const duplicateOption = page.getByRole('menuitem', {
					name: /duplicate/i,
				})
				const versionsOption = page.getByRole('menuitem', {
					name: /versions/i,
				})
				const deleteOption = page.getByRole('menuitem', { name: /delete/i })

				await expect(editOption).toBeVisible({ timeout: 3000 })
				await expect(duplicateOption).toBeVisible({ timeout: 3000 })
				await expect(versionsOption).toBeVisible({ timeout: 3000 })
				await expect(deleteOption).toBeVisible({ timeout: 3000 })

				await page.keyboard.press('Escape')
			},
		)
	})
})
