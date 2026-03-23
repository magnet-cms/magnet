import type { SchemaMetadata } from '@magnet-cms/common'
import React, { createContext, useContext, ReactNode } from 'react'
import { useSchemas, useSettings } from '~/hooks/useDiscovery'

type AdminContextType = {
	isLoading: boolean
	error: Error | null
	schemas?: SchemaMetadata[]
	settings?: string[]
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export const AdminProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
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
		isLoading: isSchemasLoading || isSettingsLoading,
		error: schemasError || settingsError || null,
		schemas,
		settings,
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
