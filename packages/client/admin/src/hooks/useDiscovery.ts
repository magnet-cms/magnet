import { ControllerMetadata, SchemaMetadata } from '@magnet/common'
import { useQuery } from '@tanstack/react-query'
import { fetcher } from '~/lib/api'

export const CONTROLLERS_KEY = ['discovery', 'controllers']
export const SCHEMAS_KEY = ['discovery', 'schemas']
export const SETTINGS_KEY = ['discovery', 'settings']

export const useControllers = () => {
	return useQuery<ControllerMetadata[], Error>({
		queryKey: CONTROLLERS_KEY,
		queryFn: () => fetcher<ControllerMetadata[]>('/discovery/controllers'),
	})
}

export const useSchemas = () => {
	return useQuery<SchemaMetadata[], Error>({
		queryKey: SCHEMAS_KEY,
		queryFn: () => fetcher<SchemaMetadata[]>('/discovery/schemas'),
	})
}

export const useSettings = () => {
	return useQuery<SchemaMetadata[], Error>({
		queryKey: SETTINGS_KEY,
		queryFn: () => fetcher<SchemaMetadata[]>('/discovery/settings'),
	})
}
