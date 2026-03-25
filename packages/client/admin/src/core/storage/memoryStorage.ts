import type { TokenStorage } from '../adapters/types'

/**
 * Creates an in-memory token storage
 * Useful for SSR hydration scenarios or testing
 */
export function createMemoryStorage(): TokenStorage {
  let accessToken: string | null = null
  let refreshToken: string | null = null
  let tokenExpiry: number | null = null

  return {
    getAccessToken(): string | null {
      return accessToken
    },

    setAccessToken(token: string): void {
      accessToken = token
    },

    getRefreshToken(): string | null {
      return refreshToken
    },

    setRefreshToken(token: string): void {
      refreshToken = token
    },

    getTokenExpiry(): number | null {
      return tokenExpiry
    },

    setTokenExpiry(expiry: number): void {
      tokenExpiry = expiry
    },

    clearAll(): void {
      accessToken = null
      refreshToken = null
      tokenExpiry = null
    },
  }
}

/**
 * Creates an in-memory storage with initial values
 * Useful for testing or server-side pre-authentication
 */
export function createMemoryStorageWithInitialValues(initial: {
  accessToken?: string
  refreshToken?: string
  tokenExpiry?: number
}): TokenStorage {
  let accessToken: string | null = initial.accessToken || null
  let refreshToken: string | null = initial.refreshToken || null
  let tokenExpiry: number | null = initial.tokenExpiry || null

  return {
    getAccessToken(): string | null {
      return accessToken
    },

    setAccessToken(token: string): void {
      accessToken = token
    },

    getRefreshToken(): string | null {
      return refreshToken
    },

    setRefreshToken(token: string): void {
      refreshToken = token
    },

    getTokenExpiry(): number | null {
      return tokenExpiry
    },

    setTokenExpiry(expiry: number): void {
      tokenExpiry = expiry
    },

    clearAll(): void {
      accessToken = null
      refreshToken = null
      tokenExpiry = null
    },
  }
}
