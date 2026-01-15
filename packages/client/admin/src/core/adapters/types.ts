import type {
	ControllerMetadata as ControllerMetadataBase,
	SchemaMetadata as SchemaMetadataBase,
} from '@magnet/common'
import type { QueryClient } from '@tanstack/react-query'

// Re-export types from @magnet/common
export type SchemaMetadata = SchemaMetadataBase
export type ControllerMetadata = ControllerMetadataBase

// ============================================================================
// Config Types
// ============================================================================

export type RouterType = 'browser' | 'memory' | 'hash'

export interface MagnetConfig {
	/**
	 * Custom API adapter instance
	 * If not provided, a default HTTP adapter will be created
	 */
	apiAdapter?: MagnetApiAdapter

	/**
	 * Base URL for the API (used with default HTTP adapter)
	 * @default 'http://localhost:3000'
	 */
	apiBaseUrl?: string

	/**
	 * Token storage implementation
	 */
	tokenStorage?: TokenStorage

	/**
	 * Base path for the admin UI
	 */
	basePath?: string

	/**
	 * Custom QueryClient instance
	 */
	queryClient?: QueryClient

	/**
	 * Feature flags
	 */
	features?: {
		auth?: boolean
		contentManager?: boolean
		settings?: boolean
	}

	/**
	 * Callback when user is unauthorized
	 */
	onUnauthorized?: () => void

	/**
	 * Callback for handling errors
	 */
	onError?: (error: Error) => void
}

// ============================================================================
// Request/Response Types
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface ApiRequestConfig {
	method?: HttpMethod
	headers?: Record<string, string>
	body?: unknown
	params?: Record<string, string>
}

// ============================================================================
// Auth Types
// ============================================================================

export interface LoginCredentials {
	email: string
	password: string
}

export interface RegisterCredentials extends LoginCredentials {
	name: string
	role: string
}

export interface AuthTokens {
	accessToken: string
	refreshToken?: string
	expiresIn?: number
}

export interface AuthUser {
	id: string
	email: string
	name: string
	role: string
}

export interface AuthStatus {
	authenticated: boolean
	requiresSetup: boolean
	message: string
}

// ============================================================================
// Content Types
// ============================================================================

export type ContentData = Record<string, unknown>

export interface ContentQueryOptions {
	locale?: string
	status?: 'draft' | 'published'
	version?: string
}

export interface ContentCreateOptions {
	locale?: string
	createdBy?: string
}

export interface ContentUpdateOptions extends ContentQueryOptions {
	updatedBy?: string
}

export interface ContentPublishOptions {
	locale?: string
	publishedBy?: string
}

export interface LocaleStatus {
	hasDraft: boolean
	hasPublished: boolean
}

export interface VersionInfo {
	versionId: string
	status: string
	createdAt: string
	createdBy?: string
}

export interface VersionDetails extends VersionInfo {
	documentId: string
	collection: string
	data: Record<string, unknown>
	createdBy?: string
	notes?: string
}

// ============================================================================
// Token Storage Interface
// ============================================================================

export interface TokenStorage {
	getAccessToken(): string | null
	setAccessToken(token: string): void
	getRefreshToken(): string | null
	setRefreshToken(token: string): void
	getTokenExpiry(): number | null
	setTokenExpiry(expiry: number): void
	clearAll(): void
}

// ============================================================================
// API Adapter Interface
// ============================================================================

export interface MagnetApiAdapter {
	/**
	 * Generic request method for custom API calls
	 */
	request<T>(url: string, config?: ApiRequestConfig): Promise<T>

	/**
	 * Authentication operations
	 */
	auth: {
		login(credentials: LoginCredentials): Promise<AuthTokens>
		register(credentials: RegisterCredentials): Promise<AuthTokens>
		logout(): Promise<void>
		refresh(refreshToken: string): Promise<AuthTokens>
		getMe(): Promise<AuthUser>
		getStatus(): Promise<AuthStatus>
	}

	/**
	 * Discovery operations for schema/settings/controller metadata
	 */
	discovery: {
		getSchemas(): Promise<string[]>
		getSchema(name: string): Promise<SchemaMetadata>
		getSettings(): Promise<string[]>
		getSetting(name: string): Promise<SchemaMetadata>
		getControllers(): Promise<string[]>
		getController(name: string): Promise<ControllerMetadata>
	}

	/**
	 * Content CRUD operations with i18n and versioning support
	 */
	content: {
		list<T = ContentData>(
			schema: string,
			options?: ContentQueryOptions,
		): Promise<T[]>
		get<T = ContentData>(
			schema: string,
			documentId: string,
			options?: ContentQueryOptions,
		): Promise<T | T[]>
		create<T = ContentData>(
			schema: string,
			data: Partial<T>,
			options?: ContentCreateOptions,
		): Promise<T>
		createEmpty(
			schema: string,
			options?: { locale?: string; createdBy?: string },
		): Promise<{ documentId: string }>
		update<T = ContentData>(
			schema: string,
			documentId: string,
			data: Partial<T>,
			options?: ContentUpdateOptions,
		): Promise<T>
		delete(schema: string, documentId: string): Promise<void>
		publish<T = ContentData>(
			schema: string,
			documentId: string,
			options?: ContentPublishOptions,
		): Promise<T>
		unpublish(
			schema: string,
			documentId: string,
			locale?: string,
		): Promise<{ success: boolean }>
		addLocale<T = ContentData>(
			schema: string,
			documentId: string,
			locale: string,
			data: Partial<T>,
			createdBy?: string,
		): Promise<T>
		deleteLocale(
			schema: string,
			documentId: string,
			locale: string,
		): Promise<{ success: boolean }>
		getLocaleStatuses(
			schema: string,
			documentId: string,
		): Promise<Record<string, LocaleStatus>>
		getVersions(
			schema: string,
			documentId: string,
			locale?: string,
		): Promise<VersionInfo[]>
		restoreVersion<T = ContentData>(
			schema: string,
			documentId: string,
			locale: string,
			version: number,
		): Promise<T>
	}

	/**
	 * Settings operations
	 */
	settings: {
		getByGroup<T = ContentData>(group: string): Promise<T[]>
		updateByGroup<T = ContentData>(group: string, data: Partial<T>): Promise<T>
		getLocales(): Promise<LocalesConfig>
	}

	/**
	 * Version history operations
	 */
	history: {
		getVersions(documentId: string, collection: string): Promise<VersionInfo[]>
		getVersion(versionId: string): Promise<VersionDetails>
		publishVersion(versionId: string): Promise<void>
		archiveVersion(versionId: string): Promise<void>
		deleteVersion(versionId: string): Promise<void>
	}

	/**
	 * Schema Playground operations
	 */
	playground: {
		listSchemas(): Promise<PlaygroundSchemaListItem[]>
		getSchema(name: string): Promise<PlaygroundSchemaDetail>
		createSchema(
			data: PlaygroundCreateSchemaDto,
		): Promise<PlaygroundCreateModuleResponse>
		updateSchema(
			name: string,
			data: PlaygroundCreateSchemaDto,
		): Promise<PlaygroundUpdateSchemaResponse>
		deleteSchema(name: string): Promise<{ success: boolean }>
		previewCode(data: PlaygroundCreateSchemaDto): Promise<PlaygroundCodePreview>
	}
}

export interface LocalesConfig {
	available: Array<{ key: string; value: string }>
	configured: string[]
	default: string
}

// ============================================================================
// Playground Types
// ============================================================================

export interface PlaygroundValidationRule {
	type: string
	constraints?: (string | number)[]
	message?: string
}

export interface PlaygroundFieldUI {
	type?: string
	label?: string
	description?: string
	placeholder?: string
	tab?: string
	side?: boolean
	row?: boolean
	options?: { key: string; value: string }[]
}

export interface PlaygroundFieldProp {
	required?: boolean
	unique?: boolean
	default?: unknown
	intl?: boolean
	hidden?: boolean
	readonly?: boolean
}

export interface PlaygroundRelationConfig {
	targetSchema: string
	relationType: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany'
	inverseSide?: string
}

export interface PlaygroundSchemaField {
	name: string
	displayName: string
	type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'relation'
	tsType: string
	prop: PlaygroundFieldProp
	ui: PlaygroundFieldUI
	validations: PlaygroundValidationRule[]
	relationConfig?: PlaygroundRelationConfig
}

export interface PlaygroundSchemaOptions {
	versioning?: boolean
	i18n?: boolean
}

export interface PlaygroundCreateSchemaDto {
	name: string
	options?: PlaygroundSchemaOptions
	fields: PlaygroundSchemaField[]
}

export interface PlaygroundSchemaListItem {
	name: string
	apiId: string
	fieldCount: number
	hasVersioning: boolean
	hasI18n: boolean
	createdAt?: string
	updatedAt?: string
}

export interface PlaygroundSchemaDetail {
	name: string
	apiId: string
	options: PlaygroundSchemaOptions
	fields: PlaygroundSchemaField[]
	generatedCode: string
}

export interface PlaygroundCodePreview {
	code: string
	json: object
}

export interface PlaygroundConflictInfo {
	fieldName: string
	type: 'type_change' | 'required_change' | 'field_removed'
	message: string
	oldValue?: string
	newValue?: string
}

export interface PlaygroundCreateModuleResponse extends PlaygroundSchemaDetail {
	createdFiles: string[]
	message: string
}

export interface PlaygroundUpdateSchemaResponse extends PlaygroundSchemaDetail {
	conflicts: PlaygroundConflictInfo[]
}
