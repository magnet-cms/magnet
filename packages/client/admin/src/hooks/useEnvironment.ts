import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdapter } from '~/core/provider/MagnetProvider'

export interface Environment {
	id: string
	name: string
	connectionString: string
	description?: string
	isDefault?: boolean
	isLocal?: boolean // true for env var environment (read-only)
}

const ENVIRONMENTS_KEY = ['environments']
const SETTINGS_KEY = ['settings', 'environmentsettings']

export const useEnvironments = () => {
	const adapter = useAdapter()

	return useQuery<Environment[]>({
		queryKey: ENVIRONMENTS_KEY,
		queryFn: () => adapter.request<Environment[]>('/environments'),
	})
}

export const useUpdateEnvironments = () => {
	const adapter = useAdapter()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (environments: Environment[]) =>
			adapter.request('/settings/environmentsettings', {
				method: 'PUT',
				body: { environments },
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ENVIRONMENTS_KEY })
			queryClient.invalidateQueries({ queryKey: SETTINGS_KEY })
		},
	})
}

export const useTestConnection = () => {
	const adapter = useAdapter()

	return useMutation({
		mutationFn: (connectionString: string) =>
			adapter.request<{ success: boolean }>('/environments/test', {
				method: 'POST',
				body: { connectionString },
			}),
	})
}
