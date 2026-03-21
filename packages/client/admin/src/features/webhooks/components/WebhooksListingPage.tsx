'use client'

import {
	Badge,
	Button,
	Skeleton,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@magnet-cms/ui'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@magnet-cms/ui'
import {
	ExternalLink,
	MoreHorizontal,
	Pencil,
	Plus,
	Send,
	Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '~/features/shared'
import {
	type WebhookConfig,
	useWebhookDelete,
	useWebhookList,
	useWebhookTest,
	useWebhookUpdate,
} from '~/hooks/useWebhooks'
import { useAppIntl } from '~/i18n'

import { WebhookDeliveryLog } from './WebhookDeliveryLog'
import { WebhookFormDialog } from './WebhookFormDialog'

/**
 * Admin page listing all configured webhooks with inline actions.
 */
export function WebhooksListingPage() {
	const intl = useAppIntl()
	const { data: webhooks, isLoading, error } = useWebhookList()
	const updateMutation = useWebhookUpdate()
	const deleteMutation = useWebhookDelete()
	const testMutation = useWebhookTest()

	const [formOpen, setFormOpen] = useState(false)
	const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(
		null,
	)
	const [deliveryWebhookId, setDeliveryWebhookId] = useState<string | null>(
		null,
	)

	const handleToggleEnabled = (webhook: WebhookConfig) => {
		updateMutation.mutate(
			{ id: webhook.id, data: { enabled: !webhook.enabled } },
			{
				onSuccess: () => {
					toast.success(
						intl.formatMessage(
							{
								id: webhook.enabled
									? 'webhooks.toast.disabled'
									: 'webhooks.toast.enabled',
								defaultMessage: webhook.enabled
									? 'Webhook "{name}" disabled'
									: 'Webhook "{name}" enabled',
							},
							{ name: webhook.name },
						),
					)
				},
				onError: (err) => {
					toast.error(
						intl.formatMessage(
							{
								id: 'webhooks.toast.updateFailed',
								defaultMessage: 'Failed to update webhook: {message}',
							},
							{ message: err.message },
						),
					)
				},
			},
		)
	}

	const handleDelete = (webhook: WebhookConfig) => {
		deleteMutation.mutate(webhook.id, {
			onSuccess: () => {
				toast.success(
					intl.formatMessage(
						{
							id: 'webhooks.toast.deleted',
							defaultMessage: 'Webhook "{name}" deleted',
						},
						{ name: webhook.name },
					),
				)
			},
			onError: (err) => {
				toast.error(
					intl.formatMessage(
						{
							id: 'webhooks.toast.deleteFailed',
							defaultMessage: 'Failed to delete webhook: {message}',
						},
						{ message: err.message },
					),
				)
			},
		})
	}

	const handleTest = (webhook: WebhookConfig) => {
		testMutation.mutate(webhook.id, {
			onSuccess: (result) => {
				if (result.success) {
					toast.success(
						intl.formatMessage(
							{
								id: 'webhooks.toast.testSuccess',
								defaultMessage:
									'Test delivery successful ({statusCode}, {duration}ms)',
							},
							{
								statusCode: String(result.statusCode ?? 'OK'),
								duration: String(result.duration ?? 0),
							},
						),
					)
				} else {
					toast.error(
						intl.formatMessage(
							{
								id: 'webhooks.toast.testFailed',
								defaultMessage: 'Test delivery failed: {error}',
							},
							{ error: result.error ?? '' },
						),
					)
				}
			},
			onError: (err) => {
				toast.error(
					intl.formatMessage(
						{
							id: 'webhooks.toast.testRequestFailed',
							defaultMessage: 'Test failed: {message}',
						},
						{ message: err.message },
					),
				)
			},
		})
	}

	const handleEdit = (webhook: WebhookConfig) => {
		setEditingWebhook(webhook)
		setFormOpen(true)
	}

	const handleCreate = () => {
		setEditingWebhook(null)
		setFormOpen(true)
	}

	if (error) {
		return (
			<div className="p-6">
				<PageHeader>
					<h1 className="text-2xl font-bold">
						{intl.formatMessage({
							id: 'webhooks.title',
							defaultMessage: 'Webhooks',
						})}
					</h1>
				</PageHeader>
				<div className="text-red-500">
					{intl.formatMessage(
						{
							id: 'webhooks.loadFailed',
							defaultMessage: 'Failed to load webhooks: {message}',
						},
						{ message: error.message },
					)}
				</div>
			</div>
		)
	}

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center justify-between">
				<PageHeader>
					<h1 className="text-2xl font-bold">
						{intl.formatMessage({
							id: 'webhooks.title',
							defaultMessage: 'Webhooks',
						})}
					</h1>
				</PageHeader>
				<Button onClick={handleCreate}>
					<Plus className="h-4 w-4 mr-2" />
					{intl.formatMessage({
						id: 'webhooks.createWebhook',
						defaultMessage: 'Create Webhook',
					})}
				</Button>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			) : webhooks && webhooks.length > 0 ? (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								{intl.formatMessage({
									id: 'webhooks.table.name',
									defaultMessage: 'Name',
								})}
							</TableHead>
							<TableHead>
								{intl.formatMessage({
									id: 'webhooks.table.url',
									defaultMessage: 'URL',
								})}
							</TableHead>
							<TableHead>
								{intl.formatMessage({
									id: 'webhooks.table.events',
									defaultMessage: 'Events',
								})}
							</TableHead>
							<TableHead>
								{intl.formatMessage({
									id: 'webhooks.table.enabled',
									defaultMessage: 'Enabled',
								})}
							</TableHead>
							<TableHead className="text-right">
								{intl.formatMessage({
									id: 'webhooks.table.actions',
									defaultMessage: 'Actions',
								})}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{webhooks.map((webhook) => (
							<TableRow key={webhook.id}>
								<TableCell className="font-medium">
									{webhook.name}
									{webhook.description && (
										<p className="text-xs text-muted-foreground mt-0.5">
											{webhook.description}
										</p>
									)}
								</TableCell>
								<TableCell>
									<div className="flex items-center gap-1 max-w-[250px]">
										<ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
										<span className="truncate text-sm">{webhook.url}</span>
									</div>
								</TableCell>
								<TableCell>
									<Badge variant="secondary">
										{intl.formatMessage(
											{
												id: 'webhooks.table.eventCount',
												defaultMessage:
													'{count, plural, one {# event} other {# events}}',
											},
											{ count: webhook.events.length },
										)}
									</Badge>
								</TableCell>
								<TableCell>
									<Switch
										checked={webhook.enabled}
										onCheckedChange={() => handleToggleEnabled(webhook)}
									/>
								</TableCell>
								<TableCell className="text-right">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="icon">
												<MoreHorizontal className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem onClick={() => handleEdit(webhook)}>
												<Pencil className="h-4 w-4 mr-2" />
												{intl.formatMessage({
													id: 'webhooks.actions.edit',
													defaultMessage: 'Edit',
												})}
											</DropdownMenuItem>
											<DropdownMenuItem onClick={() => handleTest(webhook)}>
												<Send className="h-4 w-4 mr-2" />
												{intl.formatMessage({
													id: 'webhooks.actions.test',
													defaultMessage: 'Test',
												})}
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => setDeliveryWebhookId(webhook.id)}
											>
												<ExternalLink className="h-4 w-4 mr-2" />
												{intl.formatMessage({
													id: 'webhooks.actions.deliveries',
													defaultMessage: 'Deliveries',
												})}
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => handleDelete(webhook)}
												className="text-red-600"
											>
												<Trash2 className="h-4 w-4 mr-2" />
												{intl.formatMessage({
													id: 'webhooks.actions.delete',
													defaultMessage: 'Delete',
												})}
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			) : (
				<div className="text-center py-12 text-muted-foreground">
					<p className="text-lg font-medium">
						{intl.formatMessage({
							id: 'webhooks.empty.title',
							defaultMessage: 'No webhooks configured',
						})}
					</p>
					<p className="text-sm mt-1">
						{intl.formatMessage({
							id: 'webhooks.empty.description',
							defaultMessage:
								'Create a webhook to start receiving event notifications via HTTP.',
						})}
					</p>
					<Button onClick={handleCreate} className="mt-4">
						<Plus className="h-4 w-4 mr-2" />
						{intl.formatMessage({
							id: 'webhooks.createWebhook',
							defaultMessage: 'Create Webhook',
						})}
					</Button>
				</div>
			)}

			<WebhookFormDialog
				open={formOpen}
				onOpenChange={setFormOpen}
				webhook={editingWebhook}
			/>

			{deliveryWebhookId && (
				<WebhookDeliveryLog
					webhookId={deliveryWebhookId}
					open={!!deliveryWebhookId}
					onOpenChange={(open) => {
						if (!open) setDeliveryWebhookId(null)
					}}
				/>
			)}
		</div>
	)
}
