import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdapter } from '~/core/provider/MagnetProvider'

/**
 * Hook to fetch settings data by group
 * Note: This is different from useSetting in useDiscovery.ts which fetches schema metadata
 */
export const useSettingData = <T extends Record<string, unknown>>(
	group: string,
) => {
	const adapter = useAdapter()

	return useQuery<T[], Error>({
		queryKey: ['settings', group],
		queryFn: () => adapter.settings.getByGroup<T>(group),
		enabled: !!group,
	})
}

/**
 * Hook to update settings by group
 */
export const useSettingMutation = <T extends Record<string, unknown>>(
	group: string,
) => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation<T, Error, Partial<T>>({
		mutationFn: (data) => adapter.settings.updateByGroup<T>(group, data),
		onSuccess: () => {
			// Invalidate the settings query to refetch the data
			queryClient.invalidateQueries({ queryKey: ['settings', group] })
			// Also invalidate locales cache when internationalization settings change
			if (group.toLowerCase() === 'internationalization') {
				queryClient.invalidateQueries({ queryKey: ['settings', 'locales'] })
			}
		},
	})
}
