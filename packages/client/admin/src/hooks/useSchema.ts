import { SchemaMetadata } from '@magnet/common'
import { useQuery } from '@tanstack/react-query'
import { fetcher } from '~/lib/api'

export const useSchema = <T extends SchemaMetadata = SchemaMetadata>(
	schemaName: string,
) => {
	const endpoint = `/${schemaName}`
	const queryKey = [schemaName]

	const { data, isLoading, error, refetch } = useQuery<T[], Error>({
		queryKey,
		queryFn: () => fetcher<T[]>(endpoint),
	})

	const getByName = (name: string) => {
		return useQuery<T, Error>({
			queryKey: [...queryKey, name],
			queryFn: () => fetcher<T>(`${endpoint}/${name}`),
		})
	}

	return {
		data,
		isLoading,
		error,
		refetch,
		getByName,
	}
}
