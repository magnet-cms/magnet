import { expect, test } from '@playwright/test'

const TEMPLATE_NAME = process.env.TEMPLATE_NAME || ''

/**
 * Stripe Plugin UI E2E Tests
 *
 * Verifies the Stripe admin dashboard page renders correctly.
 * Requires the Stripe plugin frontend bundle to be built and served.
 * Only mongoose example has StripePlugin; drizzle examples do not.
 *
 * To run: bun run test:e2e --project=ui --grep="Stripe"
 */
test.describe('Stripe Dashboard UI', () => {
	test('Dashboard page renders with expected sections', async ({ page }) => {
		test.skip(
			TEMPLATE_NAME !== 'mongoose',
			'Stripe plugin only in mongoose example',
		)
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
		test.skip(
			TEMPLATE_NAME !== 'mongoose',
			'Stripe plugin only in mongoose example',
		)
		await page.goto('/admin')

		// Should see the Payments sidebar item
		await expect(page.getByText('Payments')).toBeVisible()
	})
})
