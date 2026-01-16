import { useQuery } from '@tanstack/react-query'
import { useAdapter } from '~/core/provider/MagnetProvider'

export interface Environment {
	id: string
	name: string
	connectionString: string
	description?: string
	isDefault?: boolean
	isLocal?: boolean // true for env var environment (read-only connection string)
}

const ENVIRONMENTS_LIST_KEY = ['environments', 'list']

export const useEnvironments = () => {
	const adapter = useAdapter()

	return useQuery<Environment[]>({
		queryKey: ENVIRONMENTS_LIST_KEY,
		queryFn: () => adapter.request<Environment[]>('/environments'),
	})
}

export const useLocalEnvironment = () => {
	const adapter = useAdapter()

	return useQuery<Environment>({
		queryKey: ['environments', 'local'],
		queryFn: () => adapter.request<Environment>('/environments/local'),
	})
}
