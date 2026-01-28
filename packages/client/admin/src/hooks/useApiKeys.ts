import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdapter } from '~/core/provider/MagnetProvider'

// ============================================================================
// Types
// ============================================================================

export interface ApiKey {
	id: string
	name: string
	description?: string
	keyPrefix: string
	permissions: string[]
	allowedSchemas?: string[]
	allowedOrigins?: string[]
	allowedIps?: string[]
	expiresAt?: string
	lastUsedAt?: string
	createdAt: string
	enabled: boolean
	rateLimit: number
	usageCount: number
}

export interface CreateApiKeyData {
	name: string
	description?: string
	permissions?: string[]
	allowedSchemas?: string[]
	allowedOrigins?: string[]
	allowedIps?: string[]
	expiresAt?: string
	rateLimit?: number
}

export interface CreateApiKeyResponse extends ApiKey {
	/** The plain key - save this! It cannot be retrieved again. */
	plainKey: string
}

export interface UpdateApiKeyData {
	name?: string
	description?: string
	permissions?: string[]
	allowedSchemas?: string[]
	allowedOrigins?: string[]
	allowedIps?: string[]
	expiresAt?: string
	enabled?: boolean
	rateLimit?: number
}

// ============================================================================
// Query Keys
// ============================================================================

export const API_KEY_KEYS = {
	all: ['api-keys'] as const,
	lists: () => [...API_KEY_KEYS.all, 'list'] as const,
	list: () => [...API_KEY_KEYS.lists()] as const,
	details: () => [...API_KEY_KEYS.all, 'detail'] as const,
	detail: (id: string) => [...API_KEY_KEYS.details(), id] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch list of API keys
 */
export const useApiKeyList = () => {
	const adapter = useAdapter()

	return useQuery<ApiKey[], Error>({
		queryKey: API_KEY_KEYS.list(),
		queryFn: () => adapter.request<ApiKey[]>('/api/api-keys'),
	})
}

/**
 * Hook to fetch a single API key by ID
 */
export const useApiKey = (id: string) => {
	const adapter = useAdapter()

	return useQuery<ApiKey, Error>({
		queryKey: API_KEY_KEYS.detail(id),
		queryFn: () => adapter.request<ApiKey>(`/api/api-keys/${id}`),
		enabled: !!id,
	})
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create a new API key
 * Note: The secretKey is only returned once on creation
 */
export const useApiKeyCreate = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<CreateApiKeyResponse, Error, CreateApiKeyData>({
		mutationFn: (data) =>
			adapter.request<CreateApiKeyResponse>('/api/api-keys', {
				method: 'POST',
				body: data,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.lists() })
		},
	})
}

/**
 * Hook to update an API key
 */
export const useApiKeyUpdate = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<ApiKey, Error, { id: string; data: UpdateApiKeyData }>({
		mutationFn: ({ id, data }) =>
			adapter.request<ApiKey>(`/api/api-keys/${id}`, {
				method: 'PUT',
				body: data,
			}),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.detail(id) })
			queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.lists() })
		},
	})
}

/**
 * Hook to revoke (delete) an API key
 */
export const useApiKeyRevoke = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<{ message: string }, Error, string>({
		mutationFn: (id) =>
			adapter.request<{ message: string }>(`/api/api-keys/${id}`, {
				method: 'DELETE',
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.lists() })
		},
	})
}

/**
 * Hook to rotate an API key (creates new key, disables old one)
 * Note: The new plainKey is only returned once
 */
export const useApiKeyRotate = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<CreateApiKeyResponse, Error, string>({
		mutationFn: (id) =>
			adapter.request<CreateApiKeyResponse>(`/api/api-keys/${id}/rotate`, {
				method: 'POST',
			}),
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.detail(id) })
			queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.lists() })
		},
	})
}
