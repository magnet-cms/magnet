import { expect, test } from '@playwright/test'

/**
 * Stripe Plugin UI E2E Tests
 *
 * Verifies the Stripe admin dashboard page renders correctly.
 * Requires the Stripe plugin frontend bundle to be built and served.
 *
 * To run: bun run test:e2e --project=ui --grep="Stripe"
 *
 * Prerequisites:
 * - StripePlugin registered in the test app
 * - Frontend bundle built (bun run build:frontend in plugin-stripe)
 * - Admin UI served at the expected URL
 */
test.describe('Stripe Dashboard UI', () => {
	test('Dashboard page renders with expected sections', async ({ page }) => {
		const response = await page.goto('/admin/stripe')
		if (response?.status() === 404) {
			test.skip(true, 'Stripe plugin not available at /admin/stripe')
			return
		}

		// Should see the dashboard title
		await expect(page.getByText('Stripe Dashboard')).toBeVisible()

		// Should see metric cards
		await expect(page.getByText('Monthly Recurring Revenue')).toBeVisible()
		await expect(page.getByText('Active Subscriptions')).toBeVisible()
		await expect(page.getByText('Revenue This Month')).toBeVisible()
		await expect(page.getByText('Churn Rate')).toBeVisible()

		// Should see revenue chart section
		await expect(page.getByText('Revenue (Last 12 Months)')).toBeVisible()

		// Should see recent payments section
		await expect(page.getByText('Recent Payments')).toBeVisible()
	})

	test('Navigation sidebar shows Stripe plugin items', async ({ page }) => {
		await page.goto('/admin')

		// Should see the Payments sidebar item
		await expect(page.getByText('Payments')).toBeVisible()
	})
})
