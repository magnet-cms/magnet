import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { fetcher } from '~/lib/api'

// Types
type LoginInput = { email: string; password: string }
type RegisterInput = {
	email: string
	password: string
	name: string
	role: string
}
type User = { id: string; email: string; name: string; role: string }
type Status = {
	authenticated: boolean
	requiresSetup: boolean
	message: string
}
type AuthResponse = {
	access_token: string
	refresh_token?: string
	expires_in?: number
}
type AuthError = {
	message: string
	code?: string
}

// Constants
export const AUTH_ME_KEY = ['auth', 'me']
export const AUTH_STATUS_KEY = ['auth', 'status']
export const AUTH_USER_KEY = ['auth', 'user']
export const TOKEN_KEY = 'auth_token'
export const REFRESH_TOKEN_KEY = 'auth_refresh_token'
export const TOKEN_EXPIRY_KEY = 'auth_token_expiry'

export const useLogin = () => {
	const queryClient = useQueryClient()

	return useMutation<AuthResponse, AuthError, LoginInput>({
		mutationFn: async (data: LoginInput) =>
			fetcher<AuthResponse>('/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			}),
		onSuccess: (data) => {
			const { access_token, refresh_token, expires_in } = data

			// Store tokens
			localStorage.setItem(TOKEN_KEY, access_token)

			// Store refresh token if available
			if (refresh_token) {
				localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token)
			}

			// Store expiry if available
			if (expires_in) {
				const expiryTime = Date.now() + expires_in * 1000
				localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())
			}

			// Invalidate queries to refetch user data
			queryClient.invalidateQueries({ queryKey: AUTH_USER_KEY })
			queryClient.invalidateQueries({ queryKey: AUTH_ME_KEY })
		},
	})
}

export const useRegister = () => {
	const queryClient = useQueryClient()

	return useMutation<AuthResponse, AuthError, RegisterInput>({
		mutationFn: async (data: RegisterInput) =>
			fetcher<AuthResponse>('/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			}),
		onSuccess: (data) => {
			const { access_token, refresh_token, expires_in } = data

			// Store tokens
			localStorage.setItem(TOKEN_KEY, access_token)

			// Store refresh token if available
			if (refresh_token) {
				localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token)
			}

			// Store expiry if available
			if (expires_in) {
				const expiryTime = Date.now() + expires_in * 1000
				localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())
			}

			// Invalidate queries to refetch user data
			queryClient.invalidateQueries({ queryKey: AUTH_USER_KEY })
			queryClient.invalidateQueries({ queryKey: AUTH_ME_KEY })
		},
	})
}

export const useRefreshToken = () => {
	const queryClient = useQueryClient()

	return useMutation<AuthResponse, AuthError>({
		mutationFn: async () => {
			const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

			if (!refreshToken) {
				throw new Error('No refresh token available')
			}

			return fetcher<AuthResponse>('/auth/refresh', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refresh_token: refreshToken }),
			})
		},
		onSuccess: (data) => {
			const { access_token, refresh_token, expires_in } = data

			// Store new tokens
			localStorage.setItem(TOKEN_KEY, access_token)

			// Store new refresh token if available
			if (refresh_token) {
				localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token)
			}

			// Store new expiry if available
			if (expires_in) {
				const expiryTime = Date.now() + expires_in * 1000
				localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())
			}

			// Invalidate queries to refetch user data
			queryClient.invalidateQueries({ queryKey: AUTH_USER_KEY })
		},
		onError: () => {
			// If refresh fails, log the user out
			localStorage.removeItem(TOKEN_KEY)
			localStorage.removeItem(REFRESH_TOKEN_KEY)
			localStorage.removeItem(TOKEN_EXPIRY_KEY)
			queryClient.removeQueries({ queryKey: AUTH_USER_KEY })
			queryClient.removeQueries({ queryKey: AUTH_ME_KEY })
		},
	})
}

export const useMe = () => {
	return useQuery<User, AuthError>({
		queryKey: AUTH_ME_KEY,
		queryFn: () => fetcher<User>('/auth/me'),
	})
}

export const useStatus = () => {
	return useQuery<Status, AuthError>({
		queryKey: AUTH_STATUS_KEY,
		queryFn: () => fetcher<Status>('/auth/status'),
	})
}

export const useLogout = () => {
	const queryClient = useQueryClient()

	return useCallback(() => {
		// Clear all auth-related data from localStorage
		localStorage.removeItem(TOKEN_KEY)
		localStorage.removeItem(REFRESH_TOKEN_KEY)
		localStorage.removeItem(TOKEN_EXPIRY_KEY)

		// Clear auth-related queries from cache
		queryClient.removeQueries({ queryKey: AUTH_USER_KEY })
		queryClient.removeQueries({ queryKey: AUTH_ME_KEY })
		queryClient.removeQueries({ queryKey: AUTH_STATUS_KEY })

		// Optionally call logout endpoint if needed
		// return fetcher('/auth/logout', { method: 'POST' })
	}, [queryClient])
}

export const useAuth = () => {
	const [token, setToken] = useState<string | null>(null)
	const [isInitializing, setIsInitializing] = useState(true)
	const { mutate: refreshToken } = useRefreshToken()

	// Initialize auth state from localStorage
	useEffect(() => {
		const storedToken = localStorage.getItem(TOKEN_KEY)
		const tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY)

		if (storedToken) {
			// Check if token is expired
			if (tokenExpiry && Number.parseInt(tokenExpiry) < Date.now()) {
				// Token expired, try to refresh
				refreshToken(undefined, {
					onSettled: () => {
						setIsInitializing(false)
					},
				})
			} else {
				// Token valid
				setToken(storedToken)
				setIsInitializing(false)
			}
		} else {
			setIsInitializing(false)
		}
	}, [refreshToken])

	// Set up token refresh interval if needed
	useEffect(() => {
		if (!token) return

		const tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
		if (!tokenExpiry) return

		const expiryTime = Number.parseInt(tokenExpiry)
		const timeUntilExpiry = expiryTime - Date.now()

		// Refresh 1 minute before expiry
		const refreshTime = Math.max(0, timeUntilExpiry - 60000)

		const refreshTimerId = setTimeout(() => {
			refreshToken()
		}, refreshTime)

		return () => clearTimeout(refreshTimerId)
	}, [token, refreshToken])

	const {
		data: user,
		isLoading: isUserLoading,
		error,
	} = useQuery<User, AuthError>({
		queryKey: AUTH_USER_KEY,
		queryFn: () => fetcher<User>('/auth/me'),
		enabled: !!token && !isInitializing,
		retry: 1,
		staleTime: 5 * 60 * 1000, // 5 minutes
	})

	const logout = useLogout()

	// Check if user has specific role
	const hasRole = useCallback(
		(role: string | string[]) => {
			if (!user) return false

			if (Array.isArray(role)) {
				return role.includes(user.role)
			}

			return user.role === role
		},
		[user],
	)

	return {
		user,
		isLoading: isUserLoading || isInitializing,
		isInitializing,
		error,
		isAuthenticated: !!user,
		hasRole,
		logout,
		refreshToken: () => refreshToken(),
	}
}
