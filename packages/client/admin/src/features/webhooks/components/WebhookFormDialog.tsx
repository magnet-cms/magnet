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

export interface WebhookFormDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	webhook: WebhookConfig | null
}

/**
 * Event categories for the multi-select picker.
 */
const EVENT_CATEGORIES: Record<string, string[]> = {
	Content: [
		'content.created',
		'content.updated',
		'content.deleted',
		'content.published',
		'content.unpublished',
		'content.version.created',
		'content.version.restored',
	],
	User: [
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
	Auth: [
		'auth.token_refreshed',
		'auth.session_created',
		'auth.session_revoked',
		'auth.failed_login_attempt',
	],
	Role: [
		'role.created',
		'role.updated',
		'role.deleted',
		'role.permissions_updated',
		'role.user_assigned',
	],
	Settings: ['settings.updated', 'settings.group_updated'],
	Media: [
		'media.uploaded',
		'media.deleted',
		'media.folder_created',
		'media.folder_deleted',
	],
	'API Key': ['api_key.created', 'api_key.revoked', 'api_key.used'],
	Plugin: ['plugin.initialized', 'plugin.destroyed'],
	Notification: ['notification.created'],
	System: ['system.startup', 'system.shutdown'],
}

/**
 * Dialog for creating or editing a webhook configuration.
 */
export function WebhookFormDialog({
	open,
	onOpenChange,
	webhook,
}: WebhookFormDialogProps) {
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

	const handleSubmit = () => {
		if (!name.trim() || !url.trim() || selectedEvents.length === 0) {
			toast.error('Name, URL, and at least one event are required')
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
						toast.success('Webhook updated')
						onOpenChange(false)
					},
					onError: (err) => toast.error(`Update failed: ${err.message}`),
				},
			)
		} else {
			createMutation.mutate(data, {
				onSuccess: (created) => {
					toast.success(
						`Webhook created. Secret: ${created.secret} (save this — it won't be shown again)`,
					)
					onOpenChange(false)
				},
				onError: (err) => toast.error(`Create failed: ${err.message}`),
			})
		}
	}

	const isPending = createMutation.isPending || updateMutation.isPending

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? 'Edit Webhook' : 'Create Webhook'}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="webhook-name">Name</Label>
						<Input
							id="webhook-name"
							placeholder="e.g., Deploy Hook"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="webhook-url">URL</Label>
						<Input
							id="webhook-url"
							placeholder="https://example.com/webhook"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="webhook-description">Description (optional)</Label>
						<Textarea
							id="webhook-description"
							placeholder="What does this webhook do?"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={2}
						/>
					</div>

					<div className="flex items-center gap-2">
						<Switch checked={enabled} onCheckedChange={setEnabled} />
						<Label>Enabled</Label>
					</div>

					<div className="space-y-3">
						<Label>Events ({selectedEvents.length} selected)</Label>
						<div className="border rounded-lg p-3 space-y-3 max-h-[300px] overflow-y-auto">
							{Object.entries(EVENT_CATEGORIES).map(([category, events]) => {
								const allSelected = events.every((e) =>
									selectedEvents.includes(e),
								)
								const someSelected =
									!allSelected && events.some((e) => selectedEvents.includes(e))

								return (
									<div key={category} className="space-y-1">
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
											{category}
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
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending
							? 'Saving...'
							: isEditing
								? 'Update Webhook'
								: 'Create Webhook'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
