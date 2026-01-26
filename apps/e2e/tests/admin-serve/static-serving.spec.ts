import { expect, test } from '@playwright/test'

test.describe('Admin Static Serving', () => {
	test('serves admin at configured path', async ({ request }) => {
		const response = await request.get('/admin')
		expect(response.ok()).toBeTruthy()
		expect(response.headers()['content-type']).toContain('text/html')

		const body = await response.text()
		expect(body).toContain('<!DOCTYPE html>')
	})

	test('serves index.html for admin root', async ({ page }) => {
		await page.goto('/admin')
		await expect(page).toHaveTitle(/Magnet/i)
	})

	test('serves static assets', async ({ request }) => {
		// First, get the index.html to find asset paths
		const indexResponse = await request.get('/admin')
		const indexHtml = await indexResponse.text()

		// Extract a JS file path from the HTML
		const jsMatch = indexHtml.match(/src="([^"]*\.js)"/)
		if (jsMatch) {
			const jsPath = jsMatch[1]
			const assetResponse = await request.get(jsPath)
			expect(assetResponse.ok()).toBeTruthy()
			expect(assetResponse.headers()['content-type']).toMatch(
				/javascript|text\/plain/,
			)
		}
	})

	test('handles SPA routes - serves index.html for unknown routes', async ({
		request,
	}) => {
		const response = await request.get('/admin/content/posts')
		expect(response.ok()).toBeTruthy()
		expect(response.headers()['content-type']).toContain('text/html')

		const body = await response.text()
		expect(body).toContain('<!DOCTYPE html>')
	})

	test('returns 404 for missing static files with extensions', async ({
		request,
	}) => {
		const response = await request.get('/admin/nonexistent.js')
		expect(response.status()).toBe(404)
	})

	test('admin UI loads without errors', async ({ page }) => {
		const errors: string[] = []
		page.on('pageerror', (error) => {
			errors.push(error.message)
		})

		await page.goto('/admin')

		// Wait for the page to be fully loaded
		await page.waitForLoadState('networkidle')

		// Check that no console errors occurred
		expect(errors).toHaveLength(0)
	})

	test('admin UI has correct base elements', async ({ page }) => {
		await page.goto('/admin')

		// Wait for React to render
		await page.waitForLoadState('networkidle')

		// Check for root element
		const root = page.locator('#root')
		await expect(root).toBeVisible()
	})
})

test.describe('Admin Serving Configuration', () => {
	test.skip('respects custom admin path', async ({ request }) => {
		// This test requires a separate backend configuration
		// Skip for now, but can be enabled with proper test setup
		const response = await request.get('/dashboard')
		expect(response.ok()).toBeTruthy()
	})

	test.skip('admin is disabled when config is false', async ({ request }) => {
		// This test requires a separate backend configuration
		// Skip for now, but can be enabled with proper test setup
		const response = await request.get('/admin')
		expect(response.status()).toBe(404)
	})
})
