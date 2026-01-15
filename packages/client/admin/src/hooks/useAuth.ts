import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import type {
	AuthStatus,
	AuthUser,
	LoginCredentials,
	RegisterCredentials,
} from '~/core/adapters/types'
import { useAdapter, useTokenStorage } from '~/core/provider/MagnetProvider'

// Query Keys
export const AUTH_ME_KEY = ['auth', 'me']
export const AUTH_STATUS_KEY = ['auth', 'status']
export const AUTH_USER_KEY = ['auth', 'user']

// Legacy token keys for backward compatibility
export const TOKEN_KEY = 'auth_token'
export const REFRESH_TOKEN_KEY = 'auth_refresh_token'
export const TOKEN_EXPIRY_KEY = 'auth_token_expiry'

type AuthError = {
	message: string
	code?: string
}

export const useLogin = () => {
	const adapter = useAdapter()
	const tokenStorage = useTokenStorage()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (credentials: LoginCredentials) => {
			return adapter.auth.login(credentials)
		},
		onSuccess: (data) => {
			const { accessToken, refreshToken, expiresIn } = data

			// Store tokens
			tokenStorage.setAccessToken(accessToken)

			// Store refresh token if available
			if (refreshToken) {
				tokenStorage.setRefreshToken(refreshToken)
			}

			// Store expiry if available
			if (expiresIn) {
				const expiryTime = Date.now() + expiresIn * 1000
				tokenStorage.setTokenExpiry(expiryTime)
			}

			// Invalidate queries to refetch user data
			queryClient.invalidateQueries({ queryKey: AUTH_USER_KEY })
			queryClient.invalidateQueries({ queryKey: AUTH_ME_KEY })
		},
	})
}

export const useRegister = () => {
	const adapter = useAdapter()
	const tokenStorage = useTokenStorage()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (credentials: RegisterCredentials) => {
			return adapter.auth.register(credentials)
		},
		onSuccess: (data) => {
			const { accessToken, refreshToken, expiresIn } = data

			// Store tokens
			tokenStorage.setAccessToken(accessToken)

			// Store refresh token if available
			if (refreshToken) {
				tokenStorage.setRefreshToken(refreshToken)
			}

			// Store expiry if available
			if (expiresIn) {
				const expiryTime = Date.now() + expiresIn * 1000
				tokenStorage.setTokenExpiry(expiryTime)
			}

			// Invalidate queries to refetch user data
			queryClient.invalidateQueries({ queryKey: AUTH_USER_KEY })
			queryClient.invalidateQueries({ queryKey: AUTH_ME_KEY })
		},
	})
}

export const useRefreshToken = () => {
	const adapter = useAdapter()
	const tokenStorage = useTokenStorage()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async () => {
			const refreshToken = tokenStorage.getRefreshToken()

			if (!refreshToken) {
				throw new Error('No refresh token available')
			}

			return adapter.auth.refresh(refreshToken)
		},
		onSuccess: (data) => {
			const { accessToken, refreshToken, expiresIn } = data

			// Store new tokens
			tokenStorage.setAccessToken(accessToken)

			// Store new refresh token if available
			if (refreshToken) {
				tokenStorage.setRefreshToken(refreshToken)
			}

			// Store new expiry if available
			if (expiresIn) {
				const expiryTime = Date.now() + expiresIn * 1000
				tokenStorage.setTokenExpiry(expiryTime)
			}

			// Invalidate queries to refetch user data
			queryClient.invalidateQueries({ queryKey: AUTH_USER_KEY })
		},
		onError: () => {
			// If refresh fails, log the user out
			tokenStorage.clearAll()
			queryClient.removeQueries({ queryKey: AUTH_USER_KEY })
			queryClient.removeQueries({ queryKey: AUTH_ME_KEY })
		},
	})
}

export const useMe = () => {
	const adapter = useAdapter()

	return useQuery<AuthUser, AuthError>({
		queryKey: AUTH_ME_KEY,
		queryFn: () => adapter.auth.getMe(),
	})
}

export const useStatus = () => {
	const adapter = useAdapter()

	return useQuery<AuthStatus, AuthError>({
		queryKey: AUTH_STATUS_KEY,
		queryFn: () => adapter.auth.getStatus(),
	})
}

export const useLogout = () => {
	const adapter = useAdapter()
	const tokenStorage = useTokenStorage()
	const queryClient = useQueryClient()

	return useCallback(async () => {
		// Call adapter logout (clears tokens internally)
		await adapter.auth.logout()

		// Also clear via tokenStorage for good measure
		tokenStorage.clearAll()

		// Clear auth-related queries from cache
		queryClient.removeQueries({ queryKey: AUTH_USER_KEY })
		queryClient.removeQueries({ queryKey: AUTH_ME_KEY })
		queryClient.removeQueries({ queryKey: AUTH_STATUS_KEY })
	}, [adapter, tokenStorage, queryClient])
}

export const useAuth = () => {
	const adapter = useAdapter()
	const tokenStorage = useTokenStorage()
	const [token, setToken] = useState<string | null>(null)
	const [isInitializing, setIsInitializing] = useState(true)
	const { mutate: refreshToken } = useRefreshToken()

	// Initialize auth state from storage
	useEffect(() => {
		const storedToken = tokenStorage.getAccessToken()
		const tokenExpiry = tokenStorage.getTokenExpiry()

		if (storedToken) {
			// Check if token is expired
			if (tokenExpiry && tokenExpiry < Date.now()) {
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
	}, [tokenStorage, refreshToken])

	// Set up token refresh interval if needed
	useEffect(() => {
		if (!token) return

		const tokenExpiry = tokenStorage.getTokenExpiry()
		if (!tokenExpiry) return

		const timeUntilExpiry = tokenExpiry - Date.now()

		// Refresh 1 minute before expiry
		const refreshTime = Math.max(0, timeUntilExpiry - 60000)

		const refreshTimerId = setTimeout(() => {
			refreshToken()
		}, refreshTime)

		return () => clearTimeout(refreshTimerId)
	}, [token, tokenStorage, refreshToken])

	const {
		data: user,
		isLoading: isUserLoading,
		error,
	} = useQuery<AuthUser, AuthError>({
		queryKey: AUTH_USER_KEY,
		queryFn: () => adapter.auth.getMe(),
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
