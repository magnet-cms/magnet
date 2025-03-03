import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type PublicRouteProps = {
	redirectTo?: string
}

export const PublicRoute: React.FC<PublicRouteProps> = ({
	redirectTo = '/',
}) => {
	const { isAuthenticated, isLoading } = useAuth()

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
			</div>
		)
	}

	if (isAuthenticated) {
		return <Navigate to={redirectTo} replace />
	}

	return <Outlet />
}
