import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdapter } from '~/core/provider/MagnetProvider'

// ============================================================================
// Types
// ============================================================================

export interface PermissionItem {
	id: string
	name: string
	description: string
	checked?: boolean
}

export interface PermissionGroup {
	id: string
	name: string
	apiId?: string
	permissions: PermissionItem[]
	isOpen?: boolean
}

export interface RoleListItem {
	id: string
	name: string
	displayName: string
	description?: string
	permissions: string[]
	isSystem: boolean
	createdAt: string
	updatedAt?: string
	userCount: number
}

export interface RoleWithPermissions {
	id: string
	name: string
	displayName: string
	description?: string
	permissions: string[]
	isSystem: boolean
	createdAt: string
	updatedAt?: string
	collectionTypes: PermissionGroup[]
	plugins: PermissionGroup[]
	system: PermissionGroup[]
}

export interface CategorizedPermissions {
	collectionTypes: PermissionGroup[]
	plugins: PermissionGroup[]
	system: PermissionGroup[]
}

export interface CreateRoleData {
	name: string
	displayName: string
	description?: string
	permissions?: string[]
}

export interface UpdateRoleData {
	displayName?: string
	description?: string
}

export interface DuplicateRoleData {
	name: string
	displayName?: string
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
 * Hook to fetch list of roles with user counts
 */
export const useRoleList = () => {
	const adapter = useAdapter()

	return useQuery<RoleListItem[], Error>({
		queryKey: ROLE_KEYS.list(),
		queryFn: () => adapter.request<RoleListItem[]>('/rbac/roles'),
	})
}

/**
 * Hook to fetch a single role by ID with resolved permissions
 */
export const useRole = (id: string) => {
	const adapter = useAdapter()

	return useQuery<RoleWithPermissions, Error>({
		queryKey: ROLE_KEYS.detail(id),
		queryFn: () => adapter.request<RoleWithPermissions>(`/rbac/roles/${id}`),
		enabled: !!id,
	})
}

/**
 * Hook to fetch all available permissions categorized
 */
export const useAvailablePermissions = () => {
	const adapter = useAdapter()

	return useQuery<CategorizedPermissions, Error>({
		queryKey: ROLE_KEYS.permissions(),
		queryFn: () => adapter.request<CategorizedPermissions>('/rbac/permissions'),
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

	return useMutation<RoleListItem, Error, CreateRoleData>({
		mutationFn: (data) =>
			adapter.request<RoleListItem>('/rbac/roles', {
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

	return useMutation<RoleListItem, Error, { id: string; data: UpdateRoleData }>(
		{
			mutationFn: ({ id, data }) =>
				adapter.request<RoleListItem>(`/rbac/roles/${id}`, {
					method: 'PUT',
					body: data,
				}),
			onSuccess: (_, { id }) => {
				queryClient.invalidateQueries({
					queryKey: ROLE_KEYS.detail(id),
				})
				queryClient.invalidateQueries({ queryKey: ROLE_KEYS.lists() })
			},
		},
	)
}

/**
 * Hook to delete a role
 */
export const useRoleDelete = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<{ deleted: boolean }, Error, string>({
		mutationFn: (id) =>
			adapter.request<{ deleted: boolean }>(`/rbac/roles/${id}`, {
				method: 'DELETE',
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ROLE_KEYS.lists() })
		},
	})
}

/**
 * Hook to duplicate a role
 */
export const useRoleDuplicate = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<
		RoleListItem,
		Error,
		{ id: string; data: DuplicateRoleData }
	>({
		mutationFn: ({ id, data }) =>
			adapter.request<RoleListItem>(`/rbac/roles/${id}/duplicate`, {
				method: 'POST',
				body: data,
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

	return useMutation<
		RoleListItem,
		Error,
		{ id: string; permissions: string[] }
	>({
		mutationFn: ({ id, permissions }) =>
			adapter.request<RoleListItem>(`/rbac/roles/${id}/permissions`, {
				method: 'PUT',
				body: { permissions },
			}),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({
				queryKey: ROLE_KEYS.detail(id),
			})
			queryClient.invalidateQueries({ queryKey: ROLE_KEYS.lists() })
		},
	})
}
