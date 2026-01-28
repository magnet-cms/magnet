import type { APIRequestContext } from '@playwright/test'

export interface Owner {
	id?: string
	_id?: string
	name: string
	email: string
	phone: string
	address?: string
}

export interface Cat {
	id?: string
	_id?: string
	tagID: string
	name: string
	birthdate: Date | string
	breed: string
	weight: number
	owner: string
	castrated: boolean
	description?: string
}

export interface MediaItem {
	id: string
	filename: string
	originalFilename: string
	mimeType: string
	size: number
	path: string
	url: string
	folder?: string
	tags?: string[]
	alt?: string
	width?: number
	height?: number
	createdAt: string
	updatedAt: string
}

export interface PaginatedMedia {
	items: MediaItem[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export interface MediaQueryOptions {
	page?: number
	limit?: number
	folder?: string
	mimeType?: string
	tags?: string[]
	search?: string
	sortBy?: 'createdAt' | 'filename' | 'size'
	sortOrder?: 'asc' | 'desc'
}

export interface AuthResponse {
	access_token: string
}

export interface RegisterData {
	email: string
	password: string
	name: string
	role: string
}

export interface AuthStatus {
	authenticated: boolean
	requiresSetup?: boolean
	message?: string
	user?: {
		id: string
		email: string
		role: string
	}
}

export interface ApiKeyResponse {
	id: string
	name: string
	description?: string
	keyPrefix: string
	permissions: string[]
	allowedSchemas?: string[]
	allowedOrigins?: string[]
	allowedIps?: string[]
	expiresAt?: string
	enabled: boolean
	rateLimit: number
	createdAt: string
	lastUsedAt?: string
	usageCount: number
}

export interface CreatedApiKeyResponse extends ApiKeyResponse {
	plainKey: string
}

export interface CreateApiKeyData {
	name: string
	description?: string
	permissions?: string[]
	allowedSchemas?: string[]
	allowedOrigins?: string[]
	allowedIps?: string[]
	expiresAt?: string
	rateLimit?: number
}

export interface UpdateApiKeyData {
	name?: string
	description?: string
	permissions?: string[]
	allowedSchemas?: string[]
	allowedOrigins?: string[]
	allowedIps?: string[]
	expiresAt?: string
	enabled?: boolean
	rateLimit?: number
}

export interface ApiKeyStats {
	totalRequests: number
	successCount: number
	errorCount: number
	successRate: number
	avgResponseTime: number
}

export class ApiClient {
	private token?: string

	constructor(
		private request: APIRequestContext,
		private baseURL: string,
	) {}

	setToken(token: string) {
		this.token = token
	}

	private getHeaders() {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		}
		if (this.token) {
			headers.Authorization = `Bearer ${this.token}`
		}
		return headers
	}

	// Health endpoints
	async getHealth() {
		return this.request.get(`${this.baseURL}/health`, {
			headers: this.getHeaders(),
		})
	}

	// Auth endpoints
	async getAuthStatus(): Promise<AuthStatus> {
		const response = await this.request.get(`${this.baseURL}/auth/status`, {
			headers: this.getHeaders(),
		})
		return response.json()
	}

	async register(data: RegisterData): Promise<AuthResponse> {
		const response = await this.request.post(`${this.baseURL}/auth/register`, {
			headers: this.getHeaders(),
			data,
		})
		return response.json()
	}

	async login(email: string, password: string): Promise<AuthResponse> {
		const response = await this.request.post(`${this.baseURL}/auth/login`, {
			headers: this.getHeaders(),
			data: { email, password },
		})
		return response.json()
	}

	async getMe() {
		return this.request.get(`${this.baseURL}/auth/me`, {
			headers: this.getHeaders(),
		})
	}

	async logout() {
		// Logout is typically handled client-side by clearing tokens
		// If there's a backend logout endpoint, it would be here
		// For now, we'll just clear the token
		this.token = undefined
	}

	async updateProfile(data: { name?: string; email?: string }) {
		return this.request.put(`${this.baseURL}/auth/account/profile`, {
			headers: this.getHeaders(),
			data,
		})
	}

	async changePassword(data: {
		currentPassword: string
		newPassword: string
	}) {
		return this.request.put(`${this.baseURL}/auth/account/password`, {
			headers: this.getHeaders(),
			data,
		})
	}

	// Owners CRUD endpoints
	async createOwner(data: Partial<Owner>) {
		return this.request.post(`${this.baseURL}/owners`, {
			headers: this.getHeaders(),
			data,
		})
	}

	async getOwners() {
		return this.request.get(`${this.baseURL}/owners`, {
			headers: this.getHeaders(),
		})
	}

	async getOwner(id: string) {
		return this.request.get(`${this.baseURL}/owners/${id}`, {
			headers: this.getHeaders(),
		})
	}

	async updateOwner(id: string, data: Partial<Owner>) {
		return this.request.put(`${this.baseURL}/owners/${id}`, {
			headers: this.getHeaders(),
			data,
		})
	}

	async deleteOwner(id: string) {
		return this.request.delete(`${this.baseURL}/owners/${id}`, {
			headers: this.getHeaders(),
		})
	}

	// Cats CRUD endpoints
	async createCat(data: Partial<Cat>) {
		return this.request.post(`${this.baseURL}/cats`, {
			headers: this.getHeaders(),
			data,
		})
	}

	async getCats() {
		return this.request.get(`${this.baseURL}/cats`, {
			headers: this.getHeaders(),
		})
	}

	async getCat(id: string) {
		return this.request.get(`${this.baseURL}/cats/${id}`, {
			headers: this.getHeaders(),
		})
	}

	async updateCat(id: string, data: Partial<Cat>) {
		return this.request.put(`${this.baseURL}/cats/${id}`, {
			headers: this.getHeaders(),
			data,
		})
	}

	async deleteCat(id: string) {
		return this.request.delete(`${this.baseURL}/cats/${id}`, {
			headers: this.getHeaders(),
		})
	}

	// Discovery endpoints
	async getSchemas() {
		return this.request.get(`${this.baseURL}/discovery/schemas`, {
			headers: this.getHeaders(),
		})
	}

	// Media endpoints
	async getMediaList(options?: MediaQueryOptions) {
		const params = new URLSearchParams()
		if (options?.page) params.set('page', String(options.page))
		if (options?.limit) params.set('limit', String(options.limit))
		if (options?.folder) params.set('folder', options.folder)
		if (options?.mimeType) params.set('mimeType', options.mimeType)
		if (options?.search) params.set('search', options.search)
		if (options?.sortBy) params.set('sortBy', options.sortBy)
		if (options?.sortOrder) params.set('sortOrder', options.sortOrder)

		const queryString = params.toString()
		const url = `${this.baseURL}/media${queryString ? `?${queryString}` : ''}`

		return this.request.get(url, {
			headers: this.getHeaders(),
		})
	}

	async getMedia(id: string) {
		return this.request.get(`${this.baseURL}/media/${id}`, {
			headers: this.getHeaders(),
		})
	}

	async uploadMedia(
		file: Buffer,
		filename: string,
		mimeType: string,
		options?: { folder?: string; tags?: string[]; alt?: string },
	) {
		const formData = new FormData()
		formData.append('file', new Blob([file], { type: mimeType }), filename)
		if (options?.folder) formData.append('folder', options.folder)
		if (options?.tags) formData.append('tags', JSON.stringify(options.tags))
		if (options?.alt) formData.append('alt', options.alt)

		return this.request.post(`${this.baseURL}/media/upload`, {
			headers: {
				...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
			},
			multipart: {
				file: {
					name: filename,
					mimeType,
					buffer: file,
				},
				...(options?.folder ? { folder: options.folder } : {}),
				...(options?.tags ? { tags: JSON.stringify(options.tags) } : {}),
				...(options?.alt ? { alt: options.alt } : {}),
			},
		})
	}

	async updateMedia(
		id: string,
		data: { alt?: string; tags?: string[]; folder?: string },
	) {
		return this.request.put(`${this.baseURL}/media/${id}`, {
			headers: this.getHeaders(),
			data,
		})
	}

	async deleteMedia(id: string) {
		return this.request.delete(`${this.baseURL}/media/${id}`, {
			headers: this.getHeaders(),
		})
	}

	async getMediaFolders() {
		return this.request.get(`${this.baseURL}/media/meta/folders`, {
			headers: this.getHeaders(),
		})
	}

	async getMediaTags() {
		return this.request.get(`${this.baseURL}/media/meta/tags`, {
			headers: this.getHeaders(),
		})
	}

	async getMediaStats() {
		return this.request.get(`${this.baseURL}/media/meta/stats`, {
			headers: this.getHeaders(),
		})
	}

	async getMediaFile(
		id: string,
		transform?: { w?: number; h?: number; f?: string; q?: number },
	) {
		const params = new URLSearchParams()
		if (transform?.w) params.set('w', String(transform.w))
		if (transform?.h) params.set('h', String(transform.h))
		if (transform?.f) params.set('f', transform.f)
		if (transform?.q) params.set('q', String(transform.q))

		const queryString = params.toString()
		const url = `${this.baseURL}/media/file/${id}${queryString ? `?${queryString}` : ''}`

		return this.request.get(url)
	}

	// Settings endpoints
	async getSettings(group: string) {
		return this.request.get(`${this.baseURL}/settings/${group}`, {
			headers: this.getHeaders(),
		})
	}

	async updateSettings(group: string, data: Record<string, unknown>) {
		return this.request.put(`${this.baseURL}/settings/${group}`, {
			headers: this.getHeaders(),
			data,
		})
	}

	// RBAC endpoints
	async getRoles() {
		return this.request.get(`${this.baseURL}/rbac/roles`, {
			headers: this.getHeaders(),
		})
	}

	async getRole(id: string) {
		return this.request.get(`${this.baseURL}/rbac/roles/${id}`, {
			headers: this.getHeaders(),
		})
	}

	async createRole(data: {
		name: string
		displayName: string
		description?: string
		permissions?: string[]
	}) {
		return this.request.post(`${this.baseURL}/rbac/roles`, {
			headers: this.getHeaders(),
			data,
		})
	}

	async updateRole(
		id: string,
		data: { displayName?: string; description?: string },
	) {
		return this.request.put(`${this.baseURL}/rbac/roles/${id}`, {
			headers: this.getHeaders(),
			data,
		})
	}

	async deleteRole(id: string) {
		return this.request.delete(`${this.baseURL}/rbac/roles/${id}`, {
			headers: this.getHeaders(),
		})
	}

	async duplicateRole(id: string, data: { name: string; displayName: string }) {
		return this.request.post(`${this.baseURL}/rbac/roles/${id}/duplicate`, {
			headers: this.getHeaders(),
			data,
		})
	}

	async updateRolePermissions(id: string, permissions: string[]) {
		return this.request.put(`${this.baseURL}/rbac/roles/${id}/permissions`, {
			headers: this.getHeaders(),
			data: { permissions },
		})
	}

	async getPermissions() {
		return this.request.get(`${this.baseURL}/rbac/permissions`, {
			headers: this.getHeaders(),
		})
	}

	async getMyPermissions() {
		return this.request.get(`${this.baseURL}/rbac/my-permissions`, {
			headers: this.getHeaders(),
		})
	}

	async checkPermission(permission: string) {
		return this.request.get(`${this.baseURL}/rbac/check/${permission}`, {
			headers: this.getHeaders(),
		})
	}

	async assignUserRole(userId: string, roleName: string) {
		return this.request.put(`${this.baseURL}/rbac/users/${userId}/role`, {
			headers: this.getHeaders(),
			data: { roleName },
		})
	}

	// Content CRUD endpoints
	async listContent(
		schema: string,
		options?: { locale?: string; status?: string },
	) {
		const params = new URLSearchParams()
		if (options?.locale) params.set('locale', options.locale)
		if (options?.status) params.set('status', options.status)

		const queryString = params.toString()
		const url = `${this.baseURL}/content/${schema}${queryString ? `?${queryString}` : ''}`

		return this.request.get(url, {
			headers: this.getHeaders(),
		})
	}

	async getContent(
		schema: string,
		documentId: string,
		options?: { locale?: string },
	) {
		const params = new URLSearchParams()
		if (options?.locale) params.set('locale', options.locale)

		const queryString = params.toString()
		const url = `${this.baseURL}/content/${schema}/${documentId}${queryString ? `?${queryString}` : ''}`

		return this.request.get(url, {
			headers: this.getHeaders(),
		})
	}

	async createContent(
		schema: string,
		data: Record<string, unknown>,
		options?: { locale?: string; createdBy?: string },
	) {
		return this.request.post(`${this.baseURL}/content/${schema}`, {
			headers: this.getHeaders(),
			data: {
				data,
				locale: options?.locale,
				createdBy: options?.createdBy,
			},
		})
	}

	async createEmptyContent(
		schema: string,
		options?: { locale?: string; createdBy?: string },
	) {
		return this.request.post(`${this.baseURL}/content/${schema}/empty`, {
			headers: this.getHeaders(),
			data: {
				locale: options?.locale,
				createdBy: options?.createdBy,
			},
		})
	}

	async updateContent(
		schema: string,
		documentId: string,
		data: Record<string, unknown>,
		options?: { locale?: string; updatedBy?: string },
	) {
		const params = new URLSearchParams()
		if (options?.locale) params.set('locale', options.locale)

		const queryString = params.toString()
		const url = `${this.baseURL}/content/${schema}/${documentId}${queryString ? `?${queryString}` : ''}`

		return this.request.put(url, {
			headers: this.getHeaders(),
			data: {
				data,
				updatedBy: options?.updatedBy,
			},
		})
	}

	async deleteContent(schema: string, documentId: string) {
		return this.request.delete(
			`${this.baseURL}/content/${schema}/${documentId}`,
			{
				headers: this.getHeaders(),
			},
		)
	}

	// API Key endpoints
	async createApiKey(data: CreateApiKeyData): Promise<CreatedApiKeyResponse> {
		const response = await this.request.post(`${this.baseURL}/api/api-keys`, {
			headers: this.getHeaders(),
			data,
		})
		return response.json()
	}

	async getApiKeys(includeDisabled = false) {
		const url = includeDisabled
			? `${this.baseURL}/api/api-keys?includeDisabled=true`
			: `${this.baseURL}/api/api-keys`
		return this.request.get(url, {
			headers: this.getHeaders(),
		})
	}

	async getApiKey(id: string) {
		return this.request.get(`${this.baseURL}/api/api-keys/${id}`, {
			headers: this.getHeaders(),
		})
	}

	async updateApiKey(id: string, data: UpdateApiKeyData) {
		return this.request.put(`${this.baseURL}/api/api-keys/${id}`, {
			headers: this.getHeaders(),
			data,
		})
	}

	async deleteApiKey(id: string) {
		return this.request.delete(`${this.baseURL}/api/api-keys/${id}`, {
			headers: this.getHeaders(),
		})
	}

	async rotateApiKey(id: string): Promise<CreatedApiKeyResponse> {
		const response = await this.request.post(
			`${this.baseURL}/api/api-keys/${id}/rotate`,
			{
				headers: this.getHeaders(),
			},
		)
		return response.json()
	}

	async revokeApiKey(id: string, reason?: string) {
		return this.request.post(`${this.baseURL}/api/api-keys/${id}/revoke`, {
			headers: this.getHeaders(),
			data: { reason },
		})
	}

	async getApiKeyUsageStats(id: string, days?: number): Promise<ApiKeyStats> {
		const url = days
			? `${this.baseURL}/api/api-keys/${id}/usage?days=${days}`
			: `${this.baseURL}/api/api-keys/${id}/usage`
		const response = await this.request.get(url, {
			headers: this.getHeaders(),
		})
		return response.json()
	}

	async getApiKeyUsageHistory(id: string, limit?: number, offset?: number) {
		const params = new URLSearchParams()
		if (limit) params.set('limit', String(limit))
		if (offset) params.set('offset', String(offset))

		const queryString = params.toString()
		const url = `${this.baseURL}/api/api-keys/${id}/usage/history${queryString ? `?${queryString}` : ''}`

		return this.request.get(url, {
			headers: this.getHeaders(),
		})
	}

	// Helper to make requests with API key authentication (instead of JWT)
	async makeApiKeyRequest(
		method: 'GET' | 'POST' | 'PUT' | 'DELETE',
		path: string,
		apiKey: string,
		data?: Record<string, unknown>,
	) {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'X-API-Key': apiKey,
		}

		const options: {
			headers: Record<string, string>
			data?: Record<string, unknown>
		} = { headers }
		if (data) options.data = data

		const url = `${this.baseURL}${path}`
		switch (method) {
			case 'GET':
				return this.request.get(url, { headers })
			case 'POST':
				return this.request.post(url, options)
			case 'PUT':
				return this.request.put(url, options)
			case 'DELETE':
				return this.request.delete(url, { headers })
		}
	}
}
