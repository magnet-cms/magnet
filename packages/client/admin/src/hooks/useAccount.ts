import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdapter } from '~/core/provider/MagnetProvider'
import { AUTH_ME_KEY, AUTH_USER_KEY } from './useAuth'

interface UpdateProfileData {
	name?: string
	email?: string
}

interface ChangePasswordData {
	currentPassword: string
	newPassword: string
}

export const useUpdateProfile = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: UpdateProfileData) => {
			return adapter.request('/auth/account/profile', {
				method: 'PUT',
				body: data,
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: AUTH_USER_KEY })
			queryClient.invalidateQueries({ queryKey: AUTH_ME_KEY })
		},
	})
}

export const useChangePassword = () => {
	const adapter = useAdapter()

	return useMutation({
		mutationFn: async (data: ChangePasswordData) => {
			return adapter.request<{ message: string }>('/auth/account/password', {
				method: 'PUT',
				body: data,
			})
		},
	})
}
