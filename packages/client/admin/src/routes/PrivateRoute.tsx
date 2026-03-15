import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, useStatus } from '../hooks/useAuth'

type PrivateRouteProps = {
	redirectTo?: string
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({
	redirectTo = '/auth',
}) => {
	const { isAuthenticated, isLoading } = useAuth()
	const { data: status, isLoading: isStatusLoading } = useStatus()

	if (isLoading || isStatusLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
			</div>
		)
	}

	if (isAuthenticated) {
		return <Outlet />
	}

	// On fresh install (no users), redirect to signup instead of login
	if (status?.requiresSetup) {
		return <Navigate to="/signup" replace />
	}

	return <Navigate to={redirectTo} replace />
}
