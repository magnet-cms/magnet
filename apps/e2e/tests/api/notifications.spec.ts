import { expect, test } from '../../src/fixtures/auth.fixture'

test.describe('Notifications API', () => {
	test('full flow — send, list, unread-count, mark-as-read, mark-all-read, cleanup', async ({
		authenticatedApiClient,
	}) => {
		// Get the current user's ID so we can send them a notification
		const meRes = await authenticatedApiClient.getMe()
		expect(meRes.ok()).toBeTruthy()
		const me = await meRes.json()
		const userId = me.id as string
		expect(userId).toBeDefined()

		// ── Send notification ──────────────────────────────────────────────
		const sendRes = await authenticatedApiClient.sendNotification({
			userId,
			type: 'info',
			title: 'E2E Test Notification',
			message: 'This notification was created by an E2E test',
			channels: ['platform'],
		})
		expect(sendRes.ok()).toBeTruthy()
		const sendBody = await sendRes.json()
		expect(sendBody.sent).toBe(true)

		// ── List notifications ─────────────────────────────────────────────
		const listRes = await authenticatedApiClient.getNotifications()
		expect(listRes.ok()).toBeTruthy()
		const listBody = await listRes.json()
		// Should be paginated response
		expect(listBody.items ?? listBody).toBeDefined()
		const items: Array<{
			id?: string
			_id?: string
			title: string
			read?: boolean
		}> = Array.isArray(listBody) ? listBody : listBody.items
		const notification = items.find((n) => n.title === 'E2E Test Notification')
		expect(notification).toBeDefined()
		const notificationId = (notification?.id ?? notification?._id) as string
		expect(notificationId).toBeDefined()

		// ── Unread count ───────────────────────────────────────────────────
		const countRes = await authenticatedApiClient.getUnreadCount()
		expect(countRes.ok()).toBeTruthy()
		const { count } = await countRes.json()
		expect(count).toBeGreaterThanOrEqual(1)

		// ── Mark single notification as read ───────────────────────────────
		const markRes =
			await authenticatedApiClient.markNotificationAsRead(notificationId)
		expect(markRes.status()).toBe(204)

		// Unread count should decrease
		const countRes2 = await authenticatedApiClient.getUnreadCount()
		expect(countRes2.ok()).toBeTruthy()
		const { count: count2 } = await countRes2.json()
		expect(count2).toBeLessThan(count)

		// ── Mark all as read ───────────────────────────────────────────────
		const markAllRes = await authenticatedApiClient.markAllNotificationsAsRead()
		expect(markAllRes.status()).toBe(204)

		// Unread count should now be 0
		const countRes3 = await authenticatedApiClient.getUnreadCount()
		expect(countRes3.ok()).toBeTruthy()
		const { count: count3 } = await countRes3.json()
		expect(count3).toBe(0)

		// ── Cleanup ────────────────────────────────────────────────────────
		// Use retentionDays=0 to delete all notifications
		const cleanupRes = await authenticatedApiClient.cleanupNotifications(0)
		expect(cleanupRes.ok()).toBeTruthy()
		const cleanupBody = await cleanupRes.json()
		expect(typeof cleanupBody.deleted).toBe('number')
	})

	test('GET /notifications/unread-count returns a number', async ({
		authenticatedApiClient,
	}) => {
		const res = await authenticatedApiClient.getUnreadCount()
		expect(res.ok()).toBeTruthy()
		const body = await res.json()
		expect(typeof body.count).toBe('number')
	})

	test('GET /notifications returns paginated list', async ({
		authenticatedApiClient,
	}) => {
		const res = await authenticatedApiClient.getNotifications({
			limit: 5,
			offset: 0,
		})
		expect(res.ok()).toBeTruthy()
		const body = await res.json()
		// Accept either array or paginated {items, total} shape
		const isArray = Array.isArray(body)
		const hasItems = !isArray && Array.isArray(body.items)
		expect(isArray || hasItems).toBe(true)
	})
})
