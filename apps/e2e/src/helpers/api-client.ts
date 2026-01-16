import type { APIRequestContext } from '@playwright/test'

export interface Cat {
	id: string
	name: string
	age: number
	breed: string
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

	// Cats CRUD endpoints
	async createCat(data: Omit<Cat, 'id'>) {
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
}
