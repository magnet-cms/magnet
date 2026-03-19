import { expect } from '@playwright/test'
import { test } from '../../src/fixtures/auth.fixture'

const TEMPLATE_NAME = process.env.TEMPLATE_NAME || ''
const CI = !!process.env.CI

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
		test.skip(CI, 'Stripe dashboard requires real Stripe API keys')
		const response = await page.goto('/admin/stripe')
		if (response?.status() === 404) {
			test.skip(true, 'Stripe plugin not available at /admin/stripe')
			return
		}

		// Wait for the page to load before checking content
		await page.waitForLoadState('networkidle')

		// Should see the dashboard title
		await expect(page.getByText('Stripe Dashboard')).toBeVisible({
			timeout: 10_000,
		})

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
		test.skip(CI, 'Stripe dashboard requires real Stripe API keys')
		await page.goto('/admin')
		await page.waitForLoadState('networkidle')

		// Should see the Payments sidebar item
		await expect(page.getByText('Payments')).toBeVisible({ timeout: 10_000 })
	})
})
