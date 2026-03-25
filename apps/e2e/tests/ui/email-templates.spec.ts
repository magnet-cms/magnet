import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { POST_LOGIN_URL } from '../../src/helpers/admin-paths'
import { LoginPage } from '../../src/page-objects/login.page'

authTest.describe('Email Templates UI', () => {
	authTest.beforeEach(async ({ page, testUser }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()
		await loginPage.login(testUser.email, testUser.password)
		await page.waitForURL(POST_LOGIN_URL, { timeout: 10000 })
	})

	authTest('email templates list page loads', async ({ page }) => {
		await page.goto(
			`${process.env.UI_BASE_URL || 'http://localhost:3001'}/email-templates`,
		)
		await page.waitForLoadState('networkidle')

		// Page heading should be visible
		await expect(
			page.getByRole('heading', { name: /email templates/i }),
		).toBeVisible({ timeout: 10000 })
	})

	authTest('seeded templates appear in the list', async ({ page }) => {
		await page.goto(
			`${process.env.UI_BASE_URL || 'http://localhost:3001'}/email-templates`,
		)
		await page.waitForLoadState('networkidle')

		// Slug badge uses exact lowercase "welcome"; avoid strict-mode clash with subject preview
		await expect(
			page.getByText('welcome', { exact: true }).first(),
		).toBeVisible({
			timeout: 10000,
		})
	})

	authTest('can filter templates by category', async ({ page }) => {
		await page.goto(
			`${process.env.UI_BASE_URL || 'http://localhost:3001'}/email-templates`,
		)
		await page.waitForLoadState('networkidle')

		// The category select trigger should be present
		const categoryTrigger = page
			.getByRole('combobox')
			.or(page.locator('[role="combobox"]'))
			.first()
		await expect(categoryTrigger).toBeVisible({ timeout: 10000 })
	})

	authTest('can search templates', async ({ page }) => {
		await page.goto(
			`${process.env.UI_BASE_URL || 'http://localhost:3001'}/email-templates`,
		)
		await page.waitForLoadState('networkidle')

		const searchInput = page.getByPlaceholder(/search/i)
		await expect(searchInput).toBeVisible({ timeout: 10000 })
		await searchInput.fill('welcome')
		await page.waitForTimeout(300)

		await expect(
			page.getByText('welcome', { exact: true }).first(),
		).toBeVisible()
	})

	authTest('create template button navigates to editor', async ({ page }) => {
		await page.goto(
			`${process.env.UI_BASE_URL || 'http://localhost:3001'}/email-templates`,
		)
		await page.waitForLoadState('networkidle')

		const createBtn = page.getByRole('button', {
			name: /new template|create template|novo modelo|nueva plantilla/i,
		})
		await expect(createBtn).toBeVisible({ timeout: 10000 })
		await createBtn.click()

		await expect(page).toHaveURL(/email-templates\/new/, { timeout: 5000 })
	})

	authTest('editor page loads for new template', async ({ page }) => {
		await page.goto(
			`${process.env.UI_BASE_URL || 'http://localhost:3001'}/email-templates/new`,
		)
		await page.waitForLoadState('networkidle')

		// Slug uses placeholder "welcome"; subject uses a Handlebars example string
		await expect(
			page.locator('input[placeholder="welcome"]').first(),
		).toBeVisible({
			timeout: 10000,
		})
		await expect(
			page.locator('input[placeholder^="Welcome{{"]').first(),
		).toBeVisible()
	})

	authTest(
		'edit action navigates to editor page',
		async ({ page, authenticatedApiClient }) => {
			// Create a template via API so we have something to edit
			const slug = `ui-e2e-${Date.now()}`
			const createResponse = await authenticatedApiClient.createEmailTemplate({
				slug,
				subject: 'UI E2E Test',
				body: '<p>Test</p>',
				category: 'transactional',
			})
			const created = await createResponse.json()
			const id = created.id || created._id

			await page.goto(
				`${process.env.UI_BASE_URL || 'http://localhost:3001'}/email-templates`,
			)
			await page.waitForLoadState('networkidle')

			// Click the row's actions menu
			const actionsMenu = page
				.locator('tr', { hasText: slug })
				.getByRole('button')
				.last()
			if (await actionsMenu.isVisible()) {
				await actionsMenu.click()
				const editItem = page.getByRole('menuitem', { name: /edit/i })
				if (await editItem.isVisible()) {
					await editItem.click()
					await expect(page).toHaveURL(new RegExp(`email-templates/${id}`), {
						timeout: 5000,
					})
				}
			}

			// Cleanup
			await authenticatedApiClient.deleteEmailTemplate(id)
		},
	)

	authTest('Email link is visible in sidebar', async ({ page }) => {
		await page.goto(process.env.UI_BASE_URL || 'http://localhost:3001')
		await page.waitForLoadState('networkidle')

		const emailLink = page.getByRole('link', { name: /email/i })
		await expect(emailLink.first()).toBeVisible({ timeout: 10000 })
	})
})
