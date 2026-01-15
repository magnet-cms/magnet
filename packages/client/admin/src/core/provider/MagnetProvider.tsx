import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, createContext, useContext, useMemo } from 'react'
import { createHttpAdapter } from '../adapters/http-adapter'
import type {
	MagnetApiAdapter,
	MagnetConfig,
	TokenStorage,
} from '../adapters/types'
import { createLegacyLocalStorage } from '../storage/localStorage'

interface MagnetContextValue {
	adapter: MagnetApiAdapter
	tokenStorage: TokenStorage
	config: MagnetConfig
}

// ============================================================================
// Context
// ============================================================================

const MagnetContext = createContext<MagnetContextValue | null>(null)

/**
 * Hook to access the full Magnet context
 */
export function useMagnet(): MagnetContextValue {
	const context = useContext(MagnetContext)
	if (!context) {
		throw new Error('useMagnet must be used within a MagnetProvider')
	}
	return context
}

/**
 * Hook to access the API adapter
 */
export function useAdapter(): MagnetApiAdapter {
	return useMagnet().adapter
}

/**
 * Hook to access the token storage
 */
export function useTokenStorage(): TokenStorage {
	return useMagnet().tokenStorage
}

/**
 * Hook to access the Magnet config
 */
export function useMagnetConfig(): MagnetConfig {
	return useMagnet().config
}

// ============================================================================
// Provider Component
// ============================================================================

export interface MagnetProviderProps {
	/**
	 * Configuration for the Magnet admin
	 */
	config?: MagnetConfig
	children: ReactNode
}

/**
 * Main provider component that sets up the Magnet admin context
 *
 * @example
 * // Minimal setup (uses defaults)
 * <MagnetProvider>
 *   <App />
 * </MagnetProvider>
 *
 * @example
 * // With custom API URL
 * <MagnetProvider config={{ apiBaseUrl: 'https://api.example.com' }}>
 *   <App />
 * </MagnetProvider>
 *
 * @example
 * // With custom adapter
 * <MagnetProvider config={{ apiAdapter: myCustomAdapter }}>
 *   <App />
 * </MagnetProvider>
 */
export function MagnetProvider({ config = {}, children }: MagnetProviderProps) {
	// Create token storage (default: legacy localStorage for backward compat)
	const tokenStorage = useMemo(() => {
		return config.tokenStorage || createLegacyLocalStorage()
	}, [config.tokenStorage])

	// Create API adapter
	const adapter = useMemo(() => {
		if (config.apiAdapter) {
			return config.apiAdapter
		}

		return createHttpAdapter({
			baseUrl: config.apiBaseUrl || 'http://localhost:3000',
			tokenStorage,
			onUnauthorized: config.onUnauthorized,
			onError: config.onError,
		})
	}, [
		config.apiAdapter,
		config.apiBaseUrl,
		config.onUnauthorized,
		config.onError,
		tokenStorage,
	])

	// Create or use provided QueryClient
	const queryClient = useMemo(() => {
		return (
			config.queryClient ||
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 5 * 60 * 1000, // 5 minutes
						retry: 1,
					},
				},
			})
		)
	}, [config.queryClient])

	// Create context value
	const contextValue = useMemo<MagnetContextValue>(
		() => ({
			adapter,
			tokenStorage,
			config,
		}),
		[adapter, tokenStorage, config],
	)

	return (
		<MagnetContext.Provider value={contextValue}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</MagnetContext.Provider>
	)
}
