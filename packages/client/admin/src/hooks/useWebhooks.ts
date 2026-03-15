import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdapter } from '~/core/provider/MagnetProvider'

// ============================================================================
// Types
// ============================================================================

export interface WebhookConfig {
	id: string
	name: string
	url: string
	description?: string
	events: string[]
	secret: string
	headers?: Record<string, string>
	enabled: boolean
	createdAt: string
	updatedAt: string
}

export interface CreateWebhookData {
	name: string
	url: string
	events: string[]
	description?: string
	headers?: Record<string, string>
	enabled?: boolean
}

export interface UpdateWebhookData {
	name?: string
	url?: string
	events?: string[]
	description?: string
	headers?: Record<string, string>
	enabled?: boolean
}

export interface WebhookDeliveryLog {
	id: string
	webhookId: string
	event: string
	url: string
	payload?: Record<string, unknown>
	statusCode?: number
	responseBody?: string
	duration?: number
	success: boolean
	error?: string
	retryCount: number
	createdAt: string
}

export interface PaginatedDeliveries {
	items: WebhookDeliveryLog[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export interface DeliveryResult {
	success: boolean
	statusCode?: number
	responseBody?: string
	duration: number
	error?: string
	retryCount: number
}

// ============================================================================
// Query Keys
// ============================================================================

export const WEBHOOK_KEYS = {
	all: ['webhooks'] as const,
	list: () => [...WEBHOOK_KEYS.all, 'list'] as const,
	detail: (id: string) => [...WEBHOOK_KEYS.all, 'detail', id] as const,
	deliveries: (id: string, page?: number) =>
		[...WEBHOOK_KEYS.all, 'deliveries', id, page] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/** Fetch all webhooks. */
export const useWebhookList = () => {
	const adapter = useAdapter()

	return useQuery<WebhookConfig[], Error>({
		queryKey: WEBHOOK_KEYS.list(),
		queryFn: () => adapter.request<WebhookConfig[]>('/webhooks'),
	})
}

/** Fetch a single webhook by ID. */
export const useWebhookDetail = (id: string) => {
	const adapter = useAdapter()

	return useQuery<WebhookConfig, Error>({
		queryKey: WEBHOOK_KEYS.detail(id),
		queryFn: () => adapter.request<WebhookConfig>(`/webhooks/${id}`),
		enabled: !!id,
	})
}

/** Fetch paginated delivery logs for a webhook. */
export const useWebhookDeliveries = (
	webhookId: string,
	page = 1,
	limit = 20,
) => {
	const adapter = useAdapter()

	return useQuery<PaginatedDeliveries, Error>({
		queryKey: WEBHOOK_KEYS.deliveries(webhookId, page),
		queryFn: () =>
			adapter.request<PaginatedDeliveries>(
				`/webhooks/${webhookId}/deliveries?page=${page}&limit=${limit}`,
			),
		enabled: !!webhookId,
	})
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/** Create a new webhook. */
export const useWebhookCreate = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<WebhookConfig, Error, CreateWebhookData>({
		mutationFn: (data) =>
			adapter.request<WebhookConfig>('/webhooks', {
				method: 'POST',
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: WEBHOOK_KEYS.list() })
		},
	})
}

/** Update an existing webhook. */
export const useWebhookUpdate = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<
		WebhookConfig,
		Error,
		{ id: string; data: UpdateWebhookData }
	>({
		mutationFn: ({ id, data }) =>
			adapter.request<WebhookConfig>(`/webhooks/${id}`, {
				method: 'PUT',
				body: JSON.stringify(data),
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: WEBHOOK_KEYS.list() })
			queryClient.invalidateQueries({
				queryKey: WEBHOOK_KEYS.detail(variables.id),
			})
		},
	})
}

/** Delete a webhook. */
export const useWebhookDelete = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<{ success: boolean }, Error, string>({
		mutationFn: (id) =>
			adapter.request<{ success: boolean }>(`/webhooks/${id}`, {
				method: 'DELETE',
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: WEBHOOK_KEYS.list() })
		},
	})
}

/** Send a test delivery to a webhook. */
export const useWebhookTest = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<DeliveryResult, Error, string>({
		mutationFn: (id) =>
			adapter.request<DeliveryResult>(`/webhooks/${id}/test`, {
				method: 'POST',
			}),
		onSuccess: (_data, id) => {
			queryClient.invalidateQueries({
				queryKey: WEBHOOK_KEYS.deliveries(id),
			})
		},
	})
}

/** Regenerate webhook secret. */
export const useWebhookRegenerateSecret = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<{ secret: string }, Error, string>({
		mutationFn: (id) =>
			adapter.request<{ secret: string }>(`/webhooks/${id}/regenerate-secret`, {
				method: 'POST',
			}),
		onSuccess: (_data, id) => {
			queryClient.invalidateQueries({ queryKey: WEBHOOK_KEYS.detail(id) })
			queryClient.invalidateQueries({ queryKey: WEBHOOK_KEYS.list() })
		},
	})
}
