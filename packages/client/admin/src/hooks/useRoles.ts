import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdapter } from '~/core/provider/MagnetProvider'

// ============================================================================
// Types
// ============================================================================

export interface Permission {
	resource: string
	actions: string[]
}

export interface Role {
	id: string
	name: string
	description?: string
	permissions: Permission[]
	isSystem?: boolean
	createdAt?: string
	updatedAt?: string
}

export interface CreateRoleData {
	name: string
	description?: string
	permissions: Permission[]
}

export interface UpdateRoleData {
	name?: string
	description?: string
	permissions?: Permission[]
}

// ============================================================================
// Query Keys
// ============================================================================

export const ROLE_KEYS = {
	all: ['roles'] as const,
	lists: () => [...ROLE_KEYS.all, 'list'] as const,
	list: () => [...ROLE_KEYS.lists()] as const,
	details: () => [...ROLE_KEYS.all, 'detail'] as const,
	detail: (id: string) => [...ROLE_KEYS.details(), id] as const,
	permissions: () => [...ROLE_KEYS.all, 'permissions'] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch list of roles
 */
export const useRoleList = () => {
	const adapter = useAdapter()

	return useQuery<Role[], Error>({
		queryKey: ROLE_KEYS.list(),
		queryFn: () => adapter.request<Role[]>('/rbac/roles'),
	})
}

/**
 * Hook to fetch a single role by ID
 */
export const useRole = (id: string) => {
	const adapter = useAdapter()

	return useQuery<Role, Error>({
		queryKey: ROLE_KEYS.detail(id),
		queryFn: () => adapter.request<Role>(`/rbac/roles/${id}`),
		enabled: !!id,
	})
}

/**
 * Hook to fetch available permissions (resources and actions)
 */
export const useAvailablePermissions = () => {
	const adapter = useAdapter()

	return useQuery<{ resources: string[]; actions: string[] }, Error>({
		queryKey: ROLE_KEYS.permissions(),
		queryFn: () =>
			adapter.request<{ resources: string[]; actions: string[] }>(
				'/rbac/permissions',
			),
	})
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create a new role
 */
export const useRoleCreate = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<Role, Error, CreateRoleData>({
		mutationFn: (data) =>
			adapter.request<Role>('/rbac/roles', {
				method: 'POST',
				body: data,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ROLE_KEYS.lists() })
		},
	})
}

/**
 * Hook to update a role
 */
export const useRoleUpdate = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<Role, Error, { id: string; data: UpdateRoleData }>({
		mutationFn: ({ id, data }) =>
			adapter.request<Role>(`/rbac/roles/${id}`, {
				method: 'PUT',
				body: data,
			}),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ROLE_KEYS.detail(id) })
			queryClient.invalidateQueries({ queryKey: ROLE_KEYS.lists() })
		},
	})
}

/**
 * Hook to delete a role
 */
export const useRoleDelete = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<{ success: boolean }, Error, string>({
		mutationFn: (id) =>
			adapter.request<{ success: boolean }>(`/rbac/roles/${id}`, {
				method: 'DELETE',
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ROLE_KEYS.lists() })
		},
	})
}

/**
 * Hook to update role permissions
 */
export const useUpdateRolePermissions = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<Role, Error, { id: string; permissions: Permission[] }>({
		mutationFn: ({ id, permissions }) =>
			adapter.request<Role>(`/rbac/roles/${id}/permissions`, {
				method: 'PUT',
				body: { permissions },
			}),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ROLE_KEYS.detail(id) })
			queryClient.invalidateQueries({ queryKey: ROLE_KEYS.lists() })
		},
	})
}
