import { useQuery } from '@tanstack/react-query'
import { fetcher } from '~/lib/api'

export type SchemaRecord = {
	id: string | number
	[key: string]: any
}

export const useSetting = <T extends SchemaRecord = SchemaRecord>(
	settingGroup: string,
) => {
	const endpoint = `/${settingGroup}`
	const queryKey = [settingGroup]

	const { data, isLoading, error, refetch } = useQuery<T[], Error>({
		queryKey,
		queryFn: () => fetcher<T[]>(endpoint),
	})

	const fetchById = async (id: string | number) => {
		return fetcher<T>(`${endpoint}/${id}`)
	}

	const getById = (id: string | number) => {
		return useQuery<T, Error>({
			queryKey: [...queryKey, id],
			queryFn: () => fetchById(id),
		})
	}

	return {
		data,
		isLoading,
		error,
		refetch,
		getById,
	}
}
