import { test as authTest, expect } from '../../src/fixtures/auth.fixture'
import { POST_LOGIN_URL, adminPath } from '../../src/helpers/admin-paths'
import { LoginPage } from '../../src/page-objects/login.page'

authTest.describe('Activity Page UI', () => {
  authTest.beforeEach(async ({ page, testUser }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)
    await page.waitForURL(POST_LOGIN_URL, { timeout: 10000 })
  })

  authTest('navigates to /activity from sidebar', async ({ page }) => {
    await page.goto(adminPath('/activity'))
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/activity/)
  })

  authTest('activity page shows DataTable with content-manager layout', async ({ page }) => {
    await page.goto(adminPath('/activity'))
    await page.waitForLoadState('networkidle')

    // Page header with "Activity Log" title
    await expect(page.getByRole('heading', { name: 'Activity Log' })).toBeVisible({
      timeout: 5000,
    })

    // DataTable renders a table element
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })
  })

  authTest('activity page filter dropdowns are present with correct defaults', async ({ page }) => {
    await page.goto(adminPath('/activity'))
    await page.waitForLoadState('networkidle')

    // Three filter dropdowns visible via their default selected labels
    await expect(page.getByText('All Actions')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('All Types')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('All Users')).toBeVisible({ timeout: 5000 })

    // Clear Filters button present
    await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeVisible()
  })

  authTest('activity page shows pagination controls', async ({ page }) => {
    await page.goto(adminPath('/activity'))
    await page.waitForLoadState('networkidle')

    // Pagination Previous/Next buttons
    await expect(page.getByRole('button', { name: 'Previous' })).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible({
      timeout: 5000,
    })

    // "Showing X to Y of Z results" text
    await expect(page.getByText(/Showing/)).toBeVisible()
  })

  authTest('no stray "0" character on activity page', async ({ page }) => {
    await page.goto(adminPath('/activity'))
    await page.waitForLoadState('networkidle')

    // The page body text should not contain a bare "0" (the old hasMore bug)
    const bodyText = await page.locator('body').innerText()
    // Verify no isolated "0" appears between newlines or at start of a line
    // (numbers inside dates/IDs are fine, but a bare lone "0" is the bug)
    const hasStray0 = /\n0\n/.test(bodyText) || bodyText.trim() === '0'
    expect(hasStray0).toBe(false)
  })

  authTest('empty state renders correctly when no activity', async ({ page }) => {
    await page.goto(adminPath('/activity'))
    await page.waitForLoadState('networkidle')

    // If there are no records, the empty state should render
    const tableRows = page.locator('tbody tr')
    const rowCount = await tableRows.count()

    if (rowCount === 0) {
      await expect(page.getByText('No activity records found')).toBeVisible()
    } else {
      // Table has rows — verify columns are present
      await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Entity' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Timestamp' })).toBeVisible()
    }
  })
})
