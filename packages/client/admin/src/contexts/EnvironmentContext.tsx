import React, { createContext, useContext, useEffect, useState } from 'react'
import { type Environment, useEnvironments } from '~/hooks/useEnvironment'

const ACTIVE_ENVIRONMENT_KEY = 'magnet_active_environment'

interface EnvironmentContextType {
	environments: Environment[]
	activeEnvironment: Environment | null
	isLoading: boolean
	error: Error | null
	setActiveEnvironment: (environment: Environment) => void
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(
	undefined,
)

export const EnvironmentProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { data: environments = [], isLoading, error } = useEnvironments()
	const [activeEnvironment, setActiveEnvironmentState] =
		useState<Environment | null>(null)

	// Initialize active environment from localStorage or default
	useEffect(() => {
		if (environments.length === 0) return

		const storedId = localStorage.getItem(ACTIVE_ENVIRONMENT_KEY)
		const stored = environments.find((env) => env.id === storedId)
		const defaultEnv = environments.find((env) => env.isDefault)

		setActiveEnvironmentState(stored ?? defaultEnv ?? environments[0] ?? null)
	}, [environments])

	const setActiveEnvironment = (environment: Environment) => {
		setActiveEnvironmentState(environment)
		localStorage.setItem(ACTIVE_ENVIRONMENT_KEY, environment.id)
	}

	return (
		<EnvironmentContext.Provider
			value={{
				environments,
				activeEnvironment,
				isLoading,
				error: error as Error | null,
				setActiveEnvironment,
			}}
		>
			{children}
		</EnvironmentContext.Provider>
	)
}

export const useEnvironmentContext = (): EnvironmentContextType => {
	const context = useContext(EnvironmentContext)
	if (context === undefined) {
		throw new Error(
			'useEnvironmentContext must be used within an EnvironmentProvider',
		)
	}
	return context
}
