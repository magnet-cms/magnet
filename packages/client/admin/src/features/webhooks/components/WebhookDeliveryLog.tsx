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
	const [page, setPage] = useState(1)
	const { data, isLoading } = useWebhookDeliveries(webhookId, page)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Delivery Log</DialogTitle>
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
									<TableHead>Event</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Duration</TableHead>
									<TableHead>Retries</TableHead>
									<TableHead>Time</TableHead>
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
													: (delivery.error ?? 'Failed')}
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
									Page {data.page} of {data.totalPages} ({data.total} total)
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
						No deliveries recorded yet.
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
