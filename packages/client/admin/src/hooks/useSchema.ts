import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
	ContentCreateOptions,
	ContentPublishOptions,
	ContentQueryOptions,
	ContentUpdateOptions,
	LocaleStatus,
	VersionInfo,
} from '~/core/adapters/types'
import { useAdapter } from '~/core/provider/MagnetProvider'

// ============================================================================
// Query Keys
// ============================================================================

export const CONTENT_KEYS = {
	all: ['content'] as const,
	lists: () => [...CONTENT_KEYS.all, 'list'] as const,
	list: (schema: string, options?: ContentQueryOptions) =>
		[...CONTENT_KEYS.lists(), schema, options?.status, options?.locale] as const,
	items: () => [...CONTENT_KEYS.all, 'item'] as const,
	item: (schema: string, documentId: string, options?: ContentQueryOptions) =>
		[...CONTENT_KEYS.items(), schema, documentId, options?.status, options?.locale] as const,
	versions: (schema: string, documentId: string, locale?: string) =>
		[...CONTENT_KEYS.all, 'versions', schema, documentId, locale] as const,
	localeStatuses: (schema: string, documentId: string) =>
		[...CONTENT_KEYS.all, 'localeStatuses', schema, documentId] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch content items for a schema
 * Note: This fetches actual content data, not schema metadata
 */
export const useContentList = <T extends Record<string, unknown>>(
	schema: string,
	options?: ContentQueryOptions,
) => {
	const adapter = useAdapter()

	return useQuery<T[], Error>({
		queryKey: CONTENT_KEYS.list(schema, options),
		queryFn: () => adapter.content.list<T>(schema, options),
		enabled: !!schema,
	})
}

/**
 * Hook to fetch a single content item by documentId
 */
export const useContentItem = <T extends Record<string, unknown>>(
	schema: string,
	documentId: string,
	options?: ContentQueryOptions,
) => {
	const adapter = useAdapter()

	return useQuery<T | T[], Error>({
		queryKey: CONTENT_KEYS.item(schema, documentId, options),
		queryFn: () => adapter.content.get<T>(schema, documentId, options),
		enabled: !!schema && !!documentId,
	})
}

/**
 * Hook to fetch versions for a content item
 */
export const useContentVersions = (
	schema: string,
	documentId: string,
	locale?: string,
) => {
	const adapter = useAdapter()

	return useQuery<VersionInfo[], Error>({
		queryKey: CONTENT_KEYS.versions(schema, documentId, locale),
		queryFn: () => adapter.content.getVersions(schema, documentId, locale),
		enabled: !!schema && !!documentId,
	})
}

/**
 * Hook to fetch locale statuses for a content item
 */
export const useLocaleStatuses = (
	schema: string,
	documentId: string,
) => {
	const adapter = useAdapter()

	return useQuery<Record<string, LocaleStatus>, Error>({
		queryKey: CONTENT_KEYS.localeStatuses(schema, documentId),
		queryFn: () => adapter.content.getLocaleStatuses(schema, documentId),
		enabled: !!schema && !!documentId,
	})
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create a new content item
 */
export const useContentCreate = <T extends Record<string, unknown>>() => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<
		T,
		Error,
		{ schema: string; data: Partial<T>; options?: ContentCreateOptions }
	>({
		mutationFn: ({ schema, data, options }) =>
			adapter.content.create<T>(schema, data, options),
		onSuccess: (_, { schema }) => {
			queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.list(schema) })
		},
	})
}

/**
 * Hook to create an empty content item (for new entries)
 */
export const useContentCreateEmpty = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<
		{ documentId: string },
		Error,
		{ schema: string; options?: { locale?: string; createdBy?: string } }
	>({
		mutationFn: ({ schema, options }) =>
			adapter.content.createEmpty(schema, options),
		onSuccess: (_, { schema }) => {
			queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.list(schema) })
		},
	})
}

/**
 * Hook to update a content item
 */
export const useContentUpdate = <T extends Record<string, unknown>>() => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<
		T,
		Error,
		{
			schema: string
			documentId: string
			data: Partial<T>
			options?: ContentUpdateOptions
		}
	>({
		mutationFn: ({ schema, documentId, data, options }) =>
			adapter.content.update<T>(schema, documentId, data, options),
		onSuccess: (_, { schema, documentId, options }) => {
			// Invalidate the specific item and list queries
			queryClient.invalidateQueries({
				queryKey: CONTENT_KEYS.item(schema, documentId, options),
			})
			queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.list(schema) })
		},
	})
}

/**
 * Hook to delete a content item
 */
export const useContentDelete = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<
		void,
		Error,
		{ schema: string; documentId: string }
	>({
		mutationFn: ({ schema, documentId }) =>
			adapter.content.delete(schema, documentId),
		onSuccess: (_, { schema }) => {
			queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.list(schema) })
			queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.items() })
		},
	})
}

/**
 * Hook to publish a content item
 */
export const useContentPublish = <T extends Record<string, unknown>>() => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<
		T,
		Error,
		{ schema: string; documentId: string; options?: ContentPublishOptions }
	>({
		mutationFn: ({ schema, documentId, options }) =>
			adapter.content.publish<T>(schema, documentId, options),
		onSuccess: (_, { schema, documentId }) => {
			// Invalidate all content queries for this schema
			queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.list(schema) })
			// Invalidate all item queries for this documentId (regardless of status/locale options)
			queryClient.invalidateQueries({
				predicate: (query) => {
					const key = query.queryKey
					return (
						Array.isArray(key) &&
						key[0] === 'content' &&
						key[1] === 'item' &&
						key[2] === schema &&
						key[3] === documentId
					)
				},
			})
			queryClient.invalidateQueries({
				queryKey: CONTENT_KEYS.localeStatuses(schema, documentId),
			})
		},
	})
}

/**
 * Hook to unpublish a content item
 */
export const useContentUnpublish = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<
		{ success: boolean },
		Error,
		{ schema: string; documentId: string; locale?: string }
	>({
		mutationFn: ({ schema, documentId, locale }) =>
			adapter.content.unpublish(schema, documentId, locale),
		onSuccess: (_, { schema, documentId }) => {
			queryClient.invalidateQueries({ queryKey: CONTENT_KEYS.list(schema) })
			queryClient.invalidateQueries({
				queryKey: CONTENT_KEYS.item(schema, documentId),
			})
			queryClient.invalidateQueries({
				queryKey: CONTENT_KEYS.localeStatuses(schema, documentId),
			})
		},
	})
}

/**
 * Hook to restore a content version
 */
export const useContentRestoreVersion = <T extends Record<string, unknown>>() => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<
		T,
		Error,
		{ schema: string; documentId: string; locale: string; version: number }
	>({
		mutationFn: ({ schema, documentId, locale, version }) =>
			adapter.content.restoreVersion<T>(schema, documentId, locale, version),
		onSuccess: (_, { schema, documentId }) => {
			queryClient.invalidateQueries({
				queryKey: CONTENT_KEYS.item(schema, documentId),
			})
			queryClient.invalidateQueries({
				queryKey: CONTENT_KEYS.versions(schema, documentId),
			})
		},
	})
}

/**
 * Hook to add a locale to a content item
 */
export const useContentAddLocale = <T extends Record<string, unknown>>() => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<
		T,
		Error,
		{
			schema: string
			documentId: string
			locale: string
			data: Partial<T>
			createdBy?: string
		}
	>({
		mutationFn: ({ schema, documentId, locale, data, createdBy }) =>
			adapter.content.addLocale<T>(schema, documentId, locale, data, createdBy),
		onSuccess: (_, { schema, documentId }) => {
			queryClient.invalidateQueries({
				queryKey: CONTENT_KEYS.item(schema, documentId),
			})
			queryClient.invalidateQueries({
				queryKey: CONTENT_KEYS.localeStatuses(schema, documentId),
			})
		},
	})
}

/**
 * Hook to delete a locale from a content item
 */
export const useContentDeleteLocale = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<
		{ success: boolean },
		Error,
		{ schema: string; documentId: string; locale: string }
	>({
		mutationFn: ({ schema, documentId, locale }) =>
			adapter.content.deleteLocale(schema, documentId, locale),
		onSuccess: (_, { schema, documentId }) => {
			queryClient.invalidateQueries({
				queryKey: CONTENT_KEYS.item(schema, documentId),
			})
			queryClient.invalidateQueries({
				queryKey: CONTENT_KEYS.localeStatuses(schema, documentId),
			})
		},
	})
}
