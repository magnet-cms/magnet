import type { ControllerMetadata, SchemaMetadata } from '@magnet/common'
import type {
	ApiRequestConfig,
	AuthStatus,
	AuthTokens,
	AuthUser,
	ContentCreateOptions,
	ContentData,
	ContentPublishOptions,
	ContentQueryOptions,
	ContentUpdateOptions,
	LocaleStatus,
	LoginCredentials,
	MagnetApiAdapter,
	MediaItem,
	MediaQueryOptions,
	MediaStats,
	MediaUploadOptions,
	PaginatedMedia,
	PlaygroundCodePreview,
	PlaygroundCreateModuleResponse,
	PlaygroundCreateSchemaDto,
	PlaygroundSchemaDetail,
	PlaygroundSchemaListItem,
	PlaygroundUpdateSchemaResponse,
	RegisterCredentials,
	TokenStorage,
	TransformOptions,
	VersionDetails,
	VersionInfo,
} from './types'

export interface HttpAdapterConfig {
	baseUrl: string
	tokenStorage: TokenStorage
	onUnauthorized?: () => void
	onError?: (error: Error) => void
}

/**
 * Creates an HTTP adapter for the Magnet API
 * This is the default adapter that communicates with the NestJS backend
 */
export function createHttpAdapter(config: HttpAdapterConfig): MagnetApiAdapter {
	const { baseUrl, tokenStorage, onUnauthorized, onError } = config

	/**
	 * Core request method that handles all HTTP communication
	 */
	async function request<T>(
		url: string,
		options?: ApiRequestConfig,
	): Promise<T> {
		const token = tokenStorage.getAccessToken()

		const res = await fetch(`${baseUrl}${url}`, {
			method: options?.method || 'GET',
			headers: {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {}),
				...options?.headers,
			},
			body: options?.body ? JSON.stringify(options.body) : undefined,
		})

		if (res.status === 401) {
			onUnauthorized?.()
			throw new Error('Unauthorized')
		}

		if (!res.ok) {
			const error = new Error(`Error ${res.status}: ${res.statusText}`)
			onError?.(error)
			throw error
		}

		// Handle empty responses (204 No Content)
		if (res.status === 204) {
			return undefined as T
		}

		return res.json()
	}

	/**
	 * Helper to build URL with query params
	 */
	function buildUrl(
		base: string,
		params?: Record<string, string | undefined>,
	): string {
		if (!params) return base

		const searchParams = new URLSearchParams()
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined) {
				searchParams.append(key, value)
			}
		}

		const query = searchParams.toString()
		return query ? `${base}?${query}` : base
	}

	/**
	 * Transform backend auth response to our AuthTokens format
	 */
	function transformAuthResponse(response: {
		access_token: string
		refresh_token?: string
		expires_in?: number
	}): AuthTokens {
		return {
			accessToken: response.access_token,
			refreshToken: response.refresh_token,
			expiresIn: response.expires_in,
		}
	}

	return {
		request,

		auth: {
			async login(credentials: LoginCredentials): Promise<AuthTokens> {
				const response = await request<{
					access_token: string
					refresh_token?: string
					expires_in?: number
				}>('/auth/login', {
					method: 'POST',
					body: credentials,
				})
				return transformAuthResponse(response)
			},

			async register(credentials: RegisterCredentials): Promise<AuthTokens> {
				const response = await request<{
					access_token: string
					refresh_token?: string
					expires_in?: number
				}>('/auth/register', {
					method: 'POST',
					body: credentials,
				})
				return transformAuthResponse(response)
			},

			async logout(): Promise<void> {
				// Clear tokens - backend logout is optional
				tokenStorage.clearAll()
			},

			async refresh(refreshToken: string): Promise<AuthTokens> {
				const response = await request<{
					access_token: string
					refresh_token?: string
					expires_in?: number
				}>('/auth/refresh', {
					method: 'POST',
					body: { refresh_token: refreshToken },
				})
				return transformAuthResponse(response)
			},

			async getMe(): Promise<AuthUser> {
				return request<AuthUser>('/auth/me')
			},

			async getStatus(): Promise<AuthStatus> {
				return request<AuthStatus>('/auth/status')
			},
		},

		discovery: {
			async getSchemas(): Promise<string[]> {
				return request<string[]>('/discovery/schemas')
			},

			async getSchema(name: string): Promise<SchemaMetadata> {
				return request<SchemaMetadata>(`/discovery/schemas/${name}`)
			},

			async getSettings(): Promise<string[]> {
				return request<string[]>('/discovery/settings')
			},

			async getSetting(name: string): Promise<SchemaMetadata> {
				return request<SchemaMetadata>(`/discovery/settings/${name}`)
			},

			async getControllers(): Promise<string[]> {
				return request<string[]>('/discovery/controllers')
			},

			async getController(name: string): Promise<ControllerMetadata> {
				return request<ControllerMetadata>(`/discovery/controllers/${name}`)
			},
		},

		content: {
			async list<T = ContentData>(
				schema: string,
				options?: ContentQueryOptions,
			): Promise<T[]> {
				const url = buildUrl(`/content/${schema}`, {
					locale: options?.locale,
					status: options?.status,
				})
				return request<T[]>(url)
			},

			async get<T = ContentData>(
				schema: string,
				documentId: string,
				options?: ContentQueryOptions,
			): Promise<T | T[]> {
				const url = buildUrl(`/content/${schema}/${documentId}`, {
					locale: options?.locale,
					status: options?.status,
				})
				return request<T | T[]>(url)
			},

			async create<T = ContentData>(
				schema: string,
				data: Partial<T>,
				options?: ContentCreateOptions,
			): Promise<T> {
				return request<T>(`/content/${schema}`, {
					method: 'POST',
					body: {
						data,
						locale: options?.locale,
						createdBy: options?.createdBy,
					},
				})
			},

			async createEmpty(
				schema: string,
				options?: { locale?: string; createdBy?: string },
			): Promise<{ documentId: string }> {
				return request<{ documentId: string }>(`/content/${schema}/new`, {
					method: 'POST',
					body: {
						locale: options?.locale,
						createdBy: options?.createdBy,
					},
				})
			},

			async update<T = ContentData>(
				schema: string,
				documentId: string,
				data: Partial<T>,
				options?: ContentUpdateOptions,
			): Promise<T> {
				const url = buildUrl(`/content/${schema}/${documentId}`, {
					locale: options?.locale,
					status: options?.status,
				})
				return request<T>(url, {
					method: 'PUT',
					body: {
						data,
						updatedBy: options?.updatedBy,
					},
				})
			},

			async delete(schema: string, documentId: string): Promise<void> {
				await request(`/content/${schema}/${documentId}`, {
					method: 'DELETE',
				})
			},

			async publish<T = ContentData>(
				schema: string,
				documentId: string,
				options?: ContentPublishOptions,
			): Promise<T> {
				const url = buildUrl(`/content/${schema}/${documentId}/publish`, {
					locale: options?.locale,
				})
				return request<T>(url, {
					method: 'POST',
					body: { publishedBy: options?.publishedBy },
				})
			},

			async unpublish(
				schema: string,
				documentId: string,
				locale?: string,
			): Promise<{ success: boolean }> {
				const url = buildUrl(`/content/${schema}/${documentId}/unpublish`, {
					locale,
				})
				return request<{ success: boolean }>(url, { method: 'POST' })
			},

			async addLocale<T = ContentData>(
				schema: string,
				documentId: string,
				locale: string,
				data: Partial<T>,
				createdBy?: string,
			): Promise<T> {
				return request<T>(`/content/${schema}/${documentId}/locale`, {
					method: 'POST',
					body: { locale, data, createdBy },
				})
			},

			async deleteLocale(
				schema: string,
				documentId: string,
				locale: string,
			): Promise<{ success: boolean }> {
				return request<{ success: boolean }>(
					`/content/${schema}/${documentId}/locale/${locale}`,
					{ method: 'DELETE' },
				)
			},

			async getLocaleStatuses(
				schema: string,
				documentId: string,
			): Promise<Record<string, LocaleStatus>> {
				return request<Record<string, LocaleStatus>>(
					`/content/${schema}/${documentId}/locales`,
				)
			},

			async getVersions(
				schema: string,
				documentId: string,
				locale?: string,
			): Promise<VersionInfo[]> {
				const url = buildUrl(`/content/${schema}/${documentId}/versions`, {
					locale,
				})
				return request<VersionInfo[]>(url)
			},

			async restoreVersion<T = ContentData>(
				schema: string,
				documentId: string,
				locale: string,
				version: number,
			): Promise<T> {
				const url = buildUrl(`/content/${schema}/${documentId}/restore`, {
					locale,
					version: String(version),
				})
				return request<T>(url, { method: 'POST' })
			},
		},

		settings: {
			async getByGroup<T = ContentData>(group: string): Promise<T[]> {
				return request<T[]>(`/settings/${group}`)
			},

			async updateByGroup<T = ContentData>(
				group: string,
				data: Partial<T>,
			): Promise<T> {
				return request<T>(`/settings/${group}`, {
					method: 'PUT',
					body: data,
				})
			},

			async getLocales(): Promise<{
				available: Array<{ key: string; value: string }>
				configured: string[]
				default: string
			}> {
				// Available locales - matches internationalization.setting.ts
				const availableLocales = [
					{ key: 'English', value: 'en' },
					{ key: 'Spanish', value: 'es' },
					{ key: 'French', value: 'fr' },
					{ key: 'German', value: 'de' },
					{ key: 'Italian', value: 'it' },
					{ key: 'Portuguese', value: 'pt' },
					{ key: 'Russian', value: 'ru' },
					{ key: 'Chinese', value: 'zh' },
					{ key: 'Japanese', value: 'ja' },
					{ key: 'Korean', value: 'ko' },
					{ key: 'Arabic', value: 'ar' },
				]

				// Fetch from internationalization settings group
				const settings = await request<Array<{ key: string; value: unknown }>>(
					'/settings/internationalization',
				)
				const localesSetting = settings.find((s) => s.key === 'locales')
				const defaultLocaleSetting = settings.find(
					(s) => s.key === 'defaultLocale',
				)

				const configured =
					Array.isArray(localesSetting?.value) &&
					localesSetting.value.length > 0
						? (localesSetting.value as string[])
						: ['en']
				const defaultLocale =
					typeof defaultLocaleSetting?.value === 'string' &&
					defaultLocaleSetting.value
						? defaultLocaleSetting.value
						: (configured[0] ?? 'en')

				return {
					available: availableLocales,
					configured,
					default: defaultLocale,
				}
			},
		},

		history: {
			async getVersions(
				documentId: string,
				collection: string,
			): Promise<VersionInfo[]> {
				const url = buildUrl(`/history/versions/${documentId}`, { collection })
				return request<VersionInfo[]>(url)
			},

			async getVersion(versionId: string): Promise<VersionDetails> {
				return request<VersionDetails>(`/history/version/${versionId}`)
			},

			async publishVersion(versionId: string): Promise<void> {
				await request(`/history/version/${versionId}/publish`, {
					method: 'PUT',
				})
			},

			async archiveVersion(versionId: string): Promise<void> {
				await request(`/history/version/${versionId}/archive`, {
					method: 'PUT',
				})
			},

			async deleteVersion(versionId: string): Promise<void> {
				await request(`/history/version/${versionId}`, {
					method: 'DELETE',
				})
			},
		},

		playground: {
			async listSchemas(): Promise<PlaygroundSchemaListItem[]> {
				return request<PlaygroundSchemaListItem[]>('/playground/schemas')
			},

			async getSchema(name: string): Promise<PlaygroundSchemaDetail> {
				return request<PlaygroundSchemaDetail>(`/playground/schemas/${name}`)
			},

			async createSchema(
				data: PlaygroundCreateSchemaDto,
			): Promise<PlaygroundCreateModuleResponse> {
				return request<PlaygroundCreateModuleResponse>('/playground/schemas', {
					method: 'POST',
					body: data,
				})
			},

			async updateSchema(
				name: string,
				data: PlaygroundCreateSchemaDto,
			): Promise<PlaygroundUpdateSchemaResponse> {
				return request<PlaygroundUpdateSchemaResponse>(
					`/playground/schemas/${name}`,
					{
						method: 'PUT',
						body: data,
					},
				)
			},

			async deleteSchema(name: string): Promise<{ success: boolean }> {
				return request<{ success: boolean }>(`/playground/schemas/${name}`, {
					method: 'DELETE',
				})
			},

			async previewCode(
				data: PlaygroundCreateSchemaDto,
			): Promise<PlaygroundCodePreview> {
				return request<PlaygroundCodePreview>('/playground/preview', {
					method: 'POST',
					body: data,
				})
			},
		},

		media: {
			async list(options?: MediaQueryOptions): Promise<PaginatedMedia> {
				const params: Record<string, string | undefined> = {}
				if (options?.page) params.page = options.page.toString()
				if (options?.limit) params.limit = options.limit.toString()
				if (options?.folder) params.folder = options.folder
				if (options?.mimeType) params.mimeType = options.mimeType
				if (options?.tags?.length) params.tags = options.tags.join(',')
				if (options?.search) params.search = options.search
				if (options?.sortBy) params.sortBy = options.sortBy
				if (options?.sortOrder) params.sortOrder = options.sortOrder

				const url = buildUrl('/media', params)
				return request<PaginatedMedia>(url)
			},

			async get(id: string): Promise<MediaItem> {
				return request<MediaItem>(`/media/${id}`)
			},

			async upload(
				file: File,
				options?: MediaUploadOptions,
			): Promise<MediaItem> {
				const formData = new FormData()
				formData.append('file', file)
				if (options?.folder) formData.append('folder', options.folder)
				if (options?.tags) formData.append('tags', JSON.stringify(options.tags))
				if (options?.alt) formData.append('alt', options.alt)

				const token = tokenStorage.getAccessToken()
				const res = await fetch(`${baseUrl}/media/upload`, {
					method: 'POST',
					headers: {
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: formData,
				})

				if (res.status === 401) {
					onUnauthorized?.()
					throw new Error('Unauthorized')
				}

				if (!res.ok) {
					const error = new Error(`Upload failed: ${res.statusText}`)
					onError?.(error)
					throw error
				}

				return res.json()
			},

			async uploadMultiple(
				files: File[],
				options?: MediaUploadOptions,
			): Promise<MediaItem[]> {
				const formData = new FormData()
				for (const file of files) {
					formData.append('files', file)
				}
				if (options?.folder) formData.append('folder', options.folder)

				const token = tokenStorage.getAccessToken()
				const res = await fetch(`${baseUrl}/media/upload-multiple`, {
					method: 'POST',
					headers: {
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: formData,
				})

				if (res.status === 401) {
					onUnauthorized?.()
					throw new Error('Unauthorized')
				}

				if (!res.ok) {
					const error = new Error(`Upload failed: ${res.statusText}`)
					onError?.(error)
					throw error
				}

				return res.json()
			},

			async update(
				id: string,
				data: { alt?: string; tags?: string[]; folder?: string },
			): Promise<MediaItem> {
				return request<MediaItem>(`/media/${id}`, {
					method: 'PUT',
					body: data,
				})
			},

			async delete(id: string): Promise<{ success: boolean }> {
				return request<{ success: boolean }>(`/media/${id}`, {
					method: 'DELETE',
				})
			},

			async deleteMany(
				ids: string[],
			): Promise<{ deleted: number; failed: string[] }> {
				return request<{ deleted: number; failed: string[] }>(
					'/media/delete-many',
					{
						method: 'POST',
						body: { ids },
					},
				)
			},

			async getFolders(): Promise<string[]> {
				return request<string[]>('/media/meta/folders')
			},

			async getTags(): Promise<string[]> {
				return request<string[]>('/media/meta/tags')
			},

			async getStats(): Promise<MediaStats> {
				return request<MediaStats>('/media/meta/stats')
			},

			getUrl(id: string, transform?: TransformOptions): string {
				let url = `${baseUrl}/media/file/${id}`
				if (transform) {
					const params = new URLSearchParams()
					if (transform.width) params.set('w', transform.width.toString())
					if (transform.height) params.set('h', transform.height.toString())
					if (transform.fit) params.set('fit', transform.fit)
					if (transform.format) params.set('f', transform.format)
					if (transform.quality) params.set('q', transform.quality.toString())

					const queryString = params.toString()
					if (queryString) {
						url += `?${queryString}`
					}
				}
				return url
			},

			getFileUrl(id: string, transform?: TransformOptions): string {
				// Alias for getUrl for convenience
				return this.getUrl(id, transform)
			},
		},
	}
}
