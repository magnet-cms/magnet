import { useQuery } from '@tanstack/react-query'
import type { ContentQueryOptions } from '~/core/adapters/types'
import { useAdapter } from '~/core/provider/MagnetProvider'

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
		queryKey: ['content', 'list', schema, options?.status],
		queryFn: () => adapter.content.list<T>(schema, options),
		enabled: !!schema,
	})
}
