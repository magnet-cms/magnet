import { useQuery } from '@tanstack/react-query'
import { fetcher } from '~/lib/api'

export type SchemaRecord = {
	id: string | number
	[key: string]: any
}

export const useSchema = <T extends SchemaRecord = SchemaRecord>(
	schemaName: string,
) => {
	const endpoint = `/${schemaName}`
	const queryKey = [schemaName]

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
