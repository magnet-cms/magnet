/**
 * Configuration for createMagnetClient().
 */
export interface MagnetClientConfig {
	/** Base URL of the Magnet CMS API (e.g., 'http://localhost:3000') */
	baseUrl: string
	/** Bearer token for JWT authentication */
	token?: string
	/** API key for programmatic access (sent as x-api-key header) */
	apiKey?: string
	/** Additional headers merged into every request */
	headers?: Record<string, string>
}

/** Generic API response with typed data or error */
export interface MagnetResponse<T> {
	data?: T
	error?: unknown
	response?: Response
}
