'use client'

import {
	Badge,
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@magnet-cms/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { useWebhookDeliveries } from '~/hooks/useWebhooks'
import { useAppIntl } from '~/i18n'

export interface WebhookDeliveryLogProps {
	webhookId: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

/**
 * Dialog showing paginated delivery logs for a webhook.
 */
export function WebhookDeliveryLog({
	webhookId,
	open,
	onOpenChange,
}: WebhookDeliveryLogProps) {
	const intl = useAppIntl()
	const [page, setPage] = useState(1)
	const { data, isLoading } = useWebhookDeliveries(webhookId, page)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{intl.formatMessage({
							id: 'webhooks.deliveryLog.title',
							defaultMessage: 'Delivery Log',
						})}
					</DialogTitle>
				</DialogHeader>

				{isLoading ? (
					<div className="space-y-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : data && data.items.length > 0 ? (
					<>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>
										{intl.formatMessage({
											id: 'webhooks.deliveryLog.columnEvent',
											defaultMessage: 'Event',
										})}
									</TableHead>
									<TableHead>
										{intl.formatMessage({
											id: 'webhooks.deliveryLog.columnStatus',
											defaultMessage: 'Status',
										})}
									</TableHead>
									<TableHead>
										{intl.formatMessage({
											id: 'webhooks.deliveryLog.columnDuration',
											defaultMessage: 'Duration',
										})}
									</TableHead>
									<TableHead>
										{intl.formatMessage({
											id: 'webhooks.deliveryLog.columnRetries',
											defaultMessage: 'Retries',
										})}
									</TableHead>
									<TableHead>
										{intl.formatMessage({
											id: 'webhooks.deliveryLog.columnTime',
											defaultMessage: 'Time',
										})}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((delivery) => (
									<TableRow key={delivery.id}>
										<TableCell className="font-mono text-xs">
											{delivery.event}
										</TableCell>
										<TableCell>
											<Badge
												variant={delivery.success ? 'default' : 'destructive'}
											>
												{delivery.success
													? `${delivery.statusCode ?? 'OK'}`
													: (delivery.error ??
														intl.formatMessage({
															id: 'webhooks.deliveryLog.statusFailed',
															defaultMessage: 'Failed',
														}))}
											</Badge>
										</TableCell>
										<TableCell className="text-sm">
											{delivery.duration ? `${delivery.duration}ms` : '—'}
										</TableCell>
										<TableCell className="text-sm">
											{delivery.retryCount}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{new Date(delivery.createdAt).toLocaleString()}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>

						{data.totalPages > 1 && (
							<div className="flex items-center justify-between pt-4">
								<span className="text-sm text-muted-foreground">
									{intl.formatMessage(
										{
											id: 'webhooks.deliveryLog.pageOf',
											defaultMessage:
												'Page {page} of {totalPages} ({total} total)',
										},
										{
											page: data.page,
											totalPages: data.totalPages,
											total: data.total,
										},
									)}
								</span>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										disabled={page <= 1}
										onClick={() => setPage((p) => p - 1)}
									>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={page >= data.totalPages}
										onClick={() => setPage((p) => p + 1)}
									>
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)}
					</>
				) : (
					<div className="text-center py-8 text-muted-foreground">
						{intl.formatMessage({
							id: 'webhooks.deliveryLog.empty',
							defaultMessage: 'No deliveries recorded yet.',
						})}
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
