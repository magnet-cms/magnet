import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdapter } from '~/core/provider/MagnetProvider'

// ============================================================================
// Types
// ============================================================================

export type VaultAdapterType = 'db' | 'hashicorp' | 'supabase'

export interface VaultStatus {
	healthy: boolean
	adapter: VaultAdapterType
	masterKeyConfigured?: boolean
}

export interface VaultSecret {
	key: string
	data: Record<string, unknown>
}

export interface VaultSecretList {
	keys: string[]
}

// ============================================================================
// Query Keys
// ============================================================================

export const VAULT_KEYS = {
	all: ['vault'] as const,
	status: () => [...VAULT_KEYS.all, 'status'] as const,
	secrets: () => [...VAULT_KEYS.all, 'secrets'] as const,
	secret: (key: string) => [...VAULT_KEYS.all, 'secret', key] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch vault adapter status and health.
 */
export const useVaultStatus = () => {
	const adapter = useAdapter()

	return useQuery<VaultStatus, Error>({
		queryKey: VAULT_KEYS.status(),
		queryFn: () => adapter.request<VaultStatus>('/vault/status'),
		refetchInterval: 30_000,
	})
}

/**
 * Fetch all secret keys in the vault.
 */
export const useVaultSecrets = (prefix?: string) => {
	const adapter = useAdapter()

	return useQuery<VaultSecretList, Error>({
		queryKey: [...VAULT_KEYS.secrets(), prefix],
		queryFn: () => {
			const url = prefix
				? `/vault/secrets?prefix=${encodeURIComponent(prefix)}`
				: '/vault/secrets'
			return adapter.request<VaultSecretList>(url)
		},
	})
}

/**
 * Fetch a single secret by key (returns decrypted data).
 */
export const useVaultSecret = (key: string) => {
	const adapter = useAdapter()

	return useQuery<VaultSecret, Error>({
		queryKey: VAULT_KEYS.secret(key),
		queryFn: () =>
			adapter.request<VaultSecret>(`/vault/secrets/${encodeURIComponent(key)}`),
		enabled: !!key,
	})
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create or update a secret.
 */
export const useVaultSetSecret = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<{ success: boolean }, Error, VaultSecret>({
		mutationFn: ({ key, data }) =>
			adapter.request<{ success: boolean }>(
				`/vault/secrets/${encodeURIComponent(key)}`,
				{ method: 'POST', body: { data } },
			),
		onSuccess: (_, { key }) => {
			queryClient.invalidateQueries({ queryKey: VAULT_KEYS.secrets() })
			queryClient.invalidateQueries({ queryKey: VAULT_KEYS.secret(key) })
		},
	})
}

/**
 * Delete a secret by key.
 */
export const useVaultDeleteSecret = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<{ success: boolean }, Error, string>({
		mutationFn: (key) =>
			adapter.request<{ success: boolean }>(
				`/vault/secrets/${encodeURIComponent(key)}`,
				{ method: 'DELETE' },
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: VAULT_KEYS.secrets() })
		},
	})
}

/**
 * Clear the in-memory vault cache.
 */
export const useVaultClearCache = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<{ success: boolean }, Error, void>({
		mutationFn: () =>
			adapter.request<{ success: boolean }>('/vault/cache/clear', {
				method: 'POST',
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: VAULT_KEYS.all })
		},
	})
}
