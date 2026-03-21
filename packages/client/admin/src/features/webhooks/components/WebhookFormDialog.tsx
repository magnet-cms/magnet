'use client'

import {
	Badge,
	Button,
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Switch,
	Textarea,
} from '@magnet-cms/ui'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { WebhookConfig } from '~/hooks/useWebhooks'
import { useWebhookCreate, useWebhookUpdate } from '~/hooks/useWebhooks'
import { useAppIntl } from '~/i18n'

export interface WebhookFormDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	webhook: WebhookConfig | null
}

type WebhookCategoryId =
	| 'content'
	| 'user'
	| 'auth'
	| 'role'
	| 'settings'
	| 'media'
	| 'apiKey'
	| 'plugin'
	| 'notification'
	| 'system'

const CATEGORY_ORDER: WebhookCategoryId[] = [
	'content',
	'user',
	'auth',
	'role',
	'settings',
	'media',
	'apiKey',
	'plugin',
	'notification',
	'system',
]

/**
 * Event categories for the multi-select picker (keys map to webhooks.category.* messages).
 */
const EVENTS_BY_CATEGORY: Record<WebhookCategoryId, string[]> = {
	content: [
		'content.created',
		'content.updated',
		'content.deleted',
		'content.published',
		'content.unpublished',
		'content.version.created',
		'content.version.restored',
	],
	user: [
		'user.created',
		'user.updated',
		'user.deleted',
		'user.registered',
		'user.login',
		'user.logout',
		'user.password_changed',
		'user.password_reset_completed',
		'user.email_verified',
	],
	auth: [
		'auth.token_refreshed',
		'auth.session_created',
		'auth.session_revoked',
		'auth.failed_login_attempt',
	],
	role: [
		'role.created',
		'role.updated',
		'role.deleted',
		'role.permissions_updated',
		'role.user_assigned',
	],
	settings: ['settings.updated', 'settings.group_updated'],
	media: [
		'media.uploaded',
		'media.deleted',
		'media.folder_created',
		'media.folder_deleted',
	],
	apiKey: ['api_key.created', 'api_key.revoked', 'api_key.used'],
	plugin: ['plugin.initialized', 'plugin.destroyed'],
	notification: ['notification.created'],
	system: ['system.startup', 'system.shutdown'],
}

/**
 * Dialog for creating or editing a webhook configuration.
 */
export function WebhookFormDialog({
	open,
	onOpenChange,
	webhook,
}: WebhookFormDialogProps) {
	const intl = useAppIntl()
	const createMutation = useWebhookCreate()
	const updateMutation = useWebhookUpdate()
	const isEditing = !!webhook

	const [name, setName] = useState('')
	const [url, setUrl] = useState('')
	const [description, setDescription] = useState('')
	const [selectedEvents, setSelectedEvents] = useState<string[]>([])
	const [enabled, setEnabled] = useState(true)

	// Populate form when editing
	useEffect(() => {
		if (webhook) {
			setName(webhook.name)
			setUrl(webhook.url)
			setDescription(webhook.description ?? '')
			setSelectedEvents(webhook.events)
			setEnabled(webhook.enabled)
		} else {
			setName('')
			setUrl('')
			setDescription('')
			setSelectedEvents([])
			setEnabled(true)
		}
	}, [webhook, open])

	const toggleEvent = (event: string) => {
		setSelectedEvents((prev) =>
			prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
		)
	}

	const toggleCategory = (events: string[]) => {
		const allSelected = events.every((e) => selectedEvents.includes(e))
		if (allSelected) {
			setSelectedEvents((prev) => prev.filter((e) => !events.includes(e)))
		} else {
			setSelectedEvents((prev) => [...new Set([...prev, ...events])])
		}
	}

	const categoryLabel = (id: WebhookCategoryId) =>
		intl.formatMessage({
			id: `webhooks.category.${id}`,
			defaultMessage: id,
		})

	const handleSubmit = () => {
		if (!name.trim() || !url.trim() || selectedEvents.length === 0) {
			toast.error(
				intl.formatMessage({
					id: 'webhooks.form.validationRequired',
					defaultMessage: 'Name, URL, and at least one event are required',
				}),
			)
			return
		}

		const data = {
			name: name.trim(),
			url: url.trim(),
			description: description.trim() || undefined,
			events: selectedEvents,
			enabled,
		}

		if (isEditing && webhook) {
			updateMutation.mutate(
				{ id: webhook.id, data },
				{
					onSuccess: () => {
						toast.success(
							intl.formatMessage({
								id: 'webhooks.toast.updated',
								defaultMessage: 'Webhook updated',
							}),
						)
						onOpenChange(false)
					},
					onError: (err) =>
						toast.error(
							intl.formatMessage(
								{
									id: 'webhooks.toast.updateMutationFailed',
									defaultMessage: 'Update failed: {message}',
								},
								{ message: err.message },
							),
						),
				},
			)
		} else {
			createMutation.mutate(data, {
				onSuccess: (created) => {
					toast.success(
						intl.formatMessage(
							{
								id: 'webhooks.toast.createdWithSecret',
								defaultMessage:
									"Webhook created. Secret: {secret} (save this — it won't be shown again)",
							},
							{ secret: created.secret },
						),
					)
					onOpenChange(false)
				},
				onError: (err) =>
					toast.error(
						intl.formatMessage(
							{
								id: 'webhooks.toast.createMutationFailed',
								defaultMessage: 'Create failed: {message}',
							},
							{ message: err.message },
						),
					),
			})
		}
	}

	const isPending = createMutation.isPending || updateMutation.isPending

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditing
							? intl.formatMessage({
									id: 'webhooks.dialog.editTitle',
									defaultMessage: 'Edit Webhook',
								})
							: intl.formatMessage({
									id: 'webhooks.dialog.createTitle',
									defaultMessage: 'Create Webhook',
								})}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="webhook-name">
							{intl.formatMessage({
								id: 'webhooks.form.name',
								defaultMessage: 'Name',
							})}
						</Label>
						<Input
							id="webhook-name"
							placeholder={intl.formatMessage({
								id: 'webhooks.form.namePlaceholder',
								defaultMessage: 'e.g., Deploy Hook',
							})}
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="webhook-url">
							{intl.formatMessage({
								id: 'webhooks.form.url',
								defaultMessage: 'URL',
							})}
						</Label>
						<Input
							id="webhook-url"
							placeholder={intl.formatMessage({
								id: 'webhooks.form.urlPlaceholder',
								defaultMessage: 'https://example.com/webhook',
							})}
							value={url}
							onChange={(e) => setUrl(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="webhook-description">
							{intl.formatMessage({
								id: 'webhooks.form.descriptionOptional',
								defaultMessage: 'Description (optional)',
							})}
						</Label>
						<Textarea
							id="webhook-description"
							placeholder={intl.formatMessage({
								id: 'webhooks.form.descriptionPlaceholder',
								defaultMessage: 'What does this webhook do?',
							})}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={2}
						/>
					</div>

					<div className="flex items-center gap-2">
						<Switch checked={enabled} onCheckedChange={setEnabled} />
						<Label>
							{intl.formatMessage({
								id: 'webhooks.form.enabled',
								defaultMessage: 'Enabled',
							})}
						</Label>
					</div>

					<div className="space-y-3">
						<Label>
							{intl.formatMessage(
								{
									id: 'webhooks.form.eventsSelected',
									defaultMessage: 'Events ({count} selected)',
								},
								{ count: selectedEvents.length },
							)}
						</Label>
						<div className="border rounded-lg p-3 space-y-3 max-h-[300px] overflow-y-auto">
							{CATEGORY_ORDER.map((categoryId) => {
								const events = EVENTS_BY_CATEGORY[categoryId]
								const allSelected = events.every((e) =>
									selectedEvents.includes(e),
								)
								const someSelected =
									!allSelected && events.some((e) => selectedEvents.includes(e))

								return (
									<div key={categoryId} className="space-y-1">
										<button
											type="button"
											onClick={() => toggleCategory(events)}
											className="flex items-center gap-2 text-sm font-medium hover:text-primary"
										>
											<input
												type="checkbox"
												checked={allSelected}
												ref={(el) => {
													if (el) el.indeterminate = someSelected
												}}
												readOnly
												className="rounded"
											/>
											{categoryLabel(categoryId)}
										</button>
										<div className="ml-6 flex flex-wrap gap-1">
											{events.map((event) => (
												<Badge
													key={event}
													variant={
														selectedEvents.includes(event)
															? 'default'
															: 'outline'
													}
													className="cursor-pointer text-xs"
													onClick={() => toggleEvent(event)}
												>
													{event}
												</Badge>
											))}
										</div>
									</div>
								)
							})}
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						{intl.formatMessage({
							id: 'common.actions.cancel',
							defaultMessage: 'Cancel',
						})}
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending
							? intl.formatMessage({
									id: 'webhooks.form.saving',
									defaultMessage: 'Saving...',
								})
							: isEditing
								? intl.formatMessage({
										id: 'webhooks.form.submitUpdate',
										defaultMessage: 'Update Webhook',
									})
								: intl.formatMessage({
										id: 'webhooks.form.submitCreate',
										defaultMessage: 'Create Webhook',
									})}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
