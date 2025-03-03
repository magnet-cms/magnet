import { ControllerMetadata, SchemaMetadata } from '@magnet/common'
import React, { createContext, useContext, ReactNode } from 'react'
import { useControllers, useSchemas, useSettings } from '~/hooks/useDiscovery'

type AdminContextType = {
	isLoading: boolean
	error: Error | null
	controllers: ControllerMetadata[] | undefined
	schemas: SchemaMetadata[] | undefined
	data?: {
		schemas?: SchemaMetadata[]
		settings?: SchemaMetadata[]
	}
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export const AdminProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const {
		data: controllers,
		isLoading: isControllersLoading,
		error: controllersError,
	} = useControllers()

	const {
		data: schemas,
		isLoading: isSchemasLoading,
		error: schemasError,
	} = useSchemas()

	const {
		data: settings,
		isLoading: isSettingsLoading,
		error: settingsError,
	} = useSettings()

	const value: AdminContextType = {
		isLoading: isControllersLoading || isSchemasLoading || isSettingsLoading,
		error: controllersError || schemasError || settingsError || null,
		controllers,
		schemas,
		data: {
			schemas,
			settings,
		},
	}

	return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export const useAdmin = (): AdminContextType => {
	const context = useContext(AdminContext)
	if (context === undefined) {
		throw new Error('useAdmin must be used within an AdminProvider')
	}
	return context
}
