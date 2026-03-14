/**
 * Event System Type Definitions
 *
 * Type-safe event system for decoupled communication between modules.
 * Used by: Activity logging, Webhooks, Auth events, RBAC events, etc.
 */

/**
 * All event names in the system
 * Adding new events requires updating this union
 */
export type EventName =
	// Content events
	| 'content.created'
	| 'content.updated'
	| 'content.deleted'
	| 'content.published'
	| 'content.unpublished'
	| 'content.version.created'
	| 'content.version.restored'
	// User events
	| 'user.created'
	| 'user.updated'
	| 'user.deleted'
	| 'user.registered'
	| 'user.login'
	| 'user.logout'
	| 'user.logout_all'
	| 'user.password_changed'
	| 'user.password_reset_requested'
	| 'user.password_reset'
	| 'user.password_reset_completed'
	| 'user.email_verified'
	| 'user.session_revoked'
	// Auth events
	| 'auth.token_refreshed'
	| 'auth.session_created'
	| 'auth.session_revoked'
	| 'auth.failed_login_attempt'
	// Role events
	| 'role.created'
	| 'role.updated'
	| 'role.deleted'
	| 'role.permissions_updated'
	| 'role.user_assigned'
	// Settings events
	| 'settings.updated'
	| 'settings.group_updated'
	// Media events
	| 'media.uploaded'
	| 'media.deleted'
	| 'media.folder_created'
	| 'media.folder_deleted'
	// API Key events
	| 'api_key.created'
	| 'api_key.revoked'
	| 'api_key.used'
	// Webhook events
	| 'webhook.created'
	| 'webhook.updated'
	| 'webhook.deleted'
	| 'webhook.delivery_success'
	| 'webhook.delivery_failed'
	// Plugin events
	| 'plugin.initialized'
	| 'plugin.destroyed'
	// Notification events
	| 'notification.created'
	// System events
	| 'system.startup'
	| 'system.shutdown'

/**
 * Base event payload with common fields
 */
export interface BaseEventPayload {
	/** Timestamp when event was emitted */
	timestamp: Date
	/** User who triggered the event (if applicable) */
	userId?: string
	/** IP address of the request (if applicable) */
	ipAddress?: string
	/** Request ID for tracing */
	requestId?: string
}

/**
 * Content event payload
 */
export interface ContentEventPayload extends BaseEventPayload {
	schema: string
	documentId: string
	locale?: string
}

/**
 * Content version event payload
 */
export interface ContentVersionEventPayload extends ContentEventPayload {
	version: number
	previousVersion?: number
}

/**
 * Field change record
 */
export interface FieldChange {
	field: string
	oldValue: unknown
	newValue: unknown
}

/**
 * User event payload
 */
export interface UserEventPayload extends BaseEventPayload {
	targetUserId: string
	email?: string
}

/**
 * Auth event payload
 */
export interface AuthEventPayload extends BaseEventPayload {
	userId: string
}

/**
 * Failed login event payload
 */
export interface FailedLoginEventPayload extends BaseEventPayload {
	email: string
	reason:
		| 'invalid_password'
		| 'user_not_found'
		| 'account_locked'
		| 'email_not_verified'
}

/**
 * Role event payload
 */
export interface RoleEventPayload extends BaseEventPayload {
	roleId: string
	roleName: string
}

/**
 * Settings event payload
 */
export interface SettingsEventPayload extends BaseEventPayload {
	key: string
	oldValue: unknown
	newValue: unknown
}

/**
 * Settings group event payload
 */
export interface SettingsGroupEventPayload extends BaseEventPayload {
	group: string
	changes: Array<{ key: string; oldValue: unknown; newValue: unknown }>
}

/**
 * Media event payload
 */
export interface MediaEventPayload extends BaseEventPayload {
	fileId: string
	filename: string
	mimeType: string
	size: number
	folder?: string
}

/**
 * Media folder event payload
 */
export interface MediaFolderEventPayload extends BaseEventPayload {
	folderId: string
	folderName: string
	parentFolder?: string
}

/**
 * API Key event payload
 */
export interface ApiKeyEventPayload extends BaseEventPayload {
	apiKeyId: string
	name: string
}

/**
 * Webhook event payload
 */
export interface WebhookEventPayload extends BaseEventPayload {
	webhookId: string
	url: string
	events: string[]
}

/**
 * Webhook delivery event payload
 */
export interface WebhookDeliveryEventPayload extends BaseEventPayload {
	webhookId: string
	deliveryId: string
	event: string
	statusCode?: number
	duration?: number
}

/**
 * Plugin event payload
 */
export interface PluginEventPayload extends BaseEventPayload {
	pluginName: string
	version: string
}

/**
 * System event payload
 */
export interface SystemEventPayload extends BaseEventPayload {
	version: string
	environment: string
}

/**
 * Notification created event payload
 */
export interface NotificationEventPayload extends BaseEventPayload {
	notificationId: string
	targetUserId: string
	type: string
	channels: string[]
}

/**
 * Event payload map - maps event names to their payload types
 */
export interface EventPayloadMap {
	// Content events
	'content.created': ContentEventPayload
	'content.updated': ContentEventPayload & { changes: FieldChange[] }
	'content.deleted': ContentEventPayload
	'content.published': ContentEventPayload
	'content.unpublished': ContentEventPayload
	'content.version.created': ContentVersionEventPayload
	'content.version.restored': ContentVersionEventPayload

	// User events
	'user.created': UserEventPayload
	'user.updated': UserEventPayload & { changes: string[] }
	'user.deleted': UserEventPayload
	'user.registered': UserEventPayload
	'user.login': UserEventPayload & { sessionId?: string }
	'user.logout': UserEventPayload & { sessionId?: string }
	'user.logout_all': UserEventPayload
	'user.password_changed': UserEventPayload
	'user.password_reset_requested': UserEventPayload & { token?: string }
	'user.password_reset': UserEventPayload
	'user.password_reset_completed': UserEventPayload
	'user.email_verified': UserEventPayload
	'user.session_revoked': UserEventPayload & { sessionId: string }

	// Auth events
	'auth.token_refreshed': AuthEventPayload
	'auth.session_created': AuthEventPayload & { sessionId: string }
	'auth.session_revoked': AuthEventPayload & {
		sessionId: string
		reason: string
	}
	'auth.failed_login_attempt': FailedLoginEventPayload

	// Role events
	'role.created': RoleEventPayload
	'role.updated': RoleEventPayload
	'role.deleted': RoleEventPayload
	'role.permissions_updated': RoleEventPayload & { permissions: string[] }
	'role.user_assigned': RoleEventPayload & { assignedUserId: string }

	// Settings events
	'settings.updated': SettingsEventPayload
	'settings.group_updated': SettingsGroupEventPayload

	// Media events
	'media.uploaded': MediaEventPayload
	'media.deleted': MediaEventPayload
	'media.folder_created': MediaFolderEventPayload
	'media.folder_deleted': MediaFolderEventPayload

	// API Key events
	'api_key.created': ApiKeyEventPayload
	'api_key.revoked': ApiKeyEventPayload & { reason?: string }
	'api_key.used': ApiKeyEventPayload & { endpoint: string }

	// Webhook events
	'webhook.created': WebhookEventPayload
	'webhook.updated': WebhookEventPayload
	'webhook.deleted': WebhookEventPayload
	'webhook.delivery_success': WebhookDeliveryEventPayload
	'webhook.delivery_failed': WebhookDeliveryEventPayload & { error: string }

	// Plugin events
	'plugin.initialized': PluginEventPayload
	'plugin.destroyed': PluginEventPayload

	// Notification events
	'notification.created': NotificationEventPayload

	// System events
	'system.startup': SystemEventPayload
	'system.shutdown': SystemEventPayload
}

/**
 * Get payload type for an event name
 */
export type EventPayload<E extends EventName> = EventPayloadMap[E]

/**
 * Event handler function type
 */
export type EventHandler<E extends EventName> = (
	payload: EventPayload<E>,
) => Promise<void> | void

/**
 * Event handler options
 */
export interface EventHandlerOptions {
	/** Priority (lower runs first, default 100) */
	priority?: number
	/** Whether handler should run async (non-blocking) */
	async?: boolean
	/** Handler name for debugging */
	name?: string
}

/**
 * Required event handler options (after defaults applied)
 */
export interface RequiredEventHandlerOptions {
	priority: number
	async: boolean
	name: string
}

/**
 * Registered handler with metadata
 */
export interface RegisteredHandler<E extends EventName> {
	handler: EventHandler<E>
	options: RequiredEventHandlerOptions
}

/**
 * Event history entry for debugging
 */
export interface EventHistoryEntry {
	event: EventName
	payload: BaseEventPayload
	timestamp: Date
}

/**
 * Event handler metadata (used by @OnEvent decorator)
 */
export interface EventHandlerMetadata {
	event: EventName
	options: EventHandlerOptions
}
