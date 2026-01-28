import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdapter } from '~/core/provider/MagnetProvider'

// ============================================================================
// Types
// ============================================================================

export interface User {
	id: string
	email: string
	name: string
	role: string
	createdAt: string
	updatedAt?: string
	lastLogin?: string
	isActive?: boolean
}

export interface CreateUserData {
	email: string
	name: string
	password: string
	role: string
}

export interface UpdateUserData {
	name?: string
	email?: string
	role?: string
	isActive?: boolean
}

export interface UserListResponse {
	users: User[]
	total: number
	page: number
	limit: number
}

// ============================================================================
// Query Keys
// ============================================================================

export const USER_KEYS = {
	all: ['users'] as const,
	lists: () => [...USER_KEYS.all, 'list'] as const,
	list: (page?: number, limit?: number) =>
		[...USER_KEYS.lists(), page, limit] as const,
	details: () => [...USER_KEYS.all, 'detail'] as const,
	detail: (id: string) => [...USER_KEYS.details(), id] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch list of users
 */
export const useUserList = (page = 1, limit = 20) => {
	const adapter = useAdapter()

	return useQuery<UserListResponse, Error>({
		queryKey: USER_KEYS.list(page, limit),
		queryFn: () =>
			adapter.request<UserListResponse>('/users', {
				params: { page: String(page), limit: String(limit) },
			}),
	})
}

/**
 * Hook to fetch a single user by ID
 */
export const useUser = (id: string) => {
	const adapter = useAdapter()

	return useQuery<User, Error>({
		queryKey: USER_KEYS.detail(id),
		queryFn: () => adapter.request<User>(`/users/${id}`),
		enabled: !!id,
	})
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create a new user
 */
export const useUserCreate = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<User, Error, CreateUserData>({
		mutationFn: (data) =>
			adapter.request<User>('/users', {
				method: 'POST',
				body: data,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: USER_KEYS.lists() })
		},
	})
}

/**
 * Hook to update a user
 */
export const useUserUpdate = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<User, Error, { id: string; data: UpdateUserData }>({
		mutationFn: ({ id, data }) =>
			adapter.request<User>(`/users/${id}`, {
				method: 'PUT',
				body: data,
			}),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: USER_KEYS.detail(id) })
			queryClient.invalidateQueries({ queryKey: USER_KEYS.lists() })
		},
	})
}

/**
 * Hook to delete a user
 */
export const useUserDelete = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<{ success: boolean }, Error, string>({
		mutationFn: (id) =>
			adapter.request<{ success: boolean }>(`/users/${id}`, {
				method: 'DELETE',
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: USER_KEYS.lists() })
		},
	})
}

/**
 * Hook to reset a user's password (admin action)
 */
export const useUserResetPassword = () => {
	const adapter = useAdapter()

	return useMutation<{ message: string }, Error, { id: string; newPassword: string }>({
		mutationFn: ({ id, newPassword }) =>
			adapter.request<{ message: string }>(`/users/${id}/reset-password`, {
				method: 'POST',
				body: { newPassword },
			}),
	})
}
