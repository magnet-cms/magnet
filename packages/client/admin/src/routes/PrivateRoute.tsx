import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, useStatus } from '../hooks/useAuth'

type PrivateRouteProps = {
	redirectTo?: string
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({
	redirectTo = '/auth',
}) => {
	const { isAuthenticated, isLoading, user } = useAuth()
	const { data: status, isLoading: isStatusLoading } = useStatus()
	const location = useLocation()

	if (isLoading || isStatusLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
			</div>
		)
	}

	if (isAuthenticated) {
		// Redirect admin users to onboarding if project settings are still defaults,
		// unless they've already skipped this session or are already on the setup page.
		if (
			!status?.onboardingCompleted &&
			user?.role === 'admin' &&
			!sessionStorage.getItem('magnet_onboarding_skipped') &&
			location.pathname !== '/setup'
		) {
			return <Navigate to="/setup" replace />
		}
		return <Outlet />
	}

	// On fresh install (no users), redirect to signup instead of login
	if (status?.requiresSetup) {
		return <Navigate to="/signup" replace />
	}

	return <Navigate to={redirectTo} replace />
}
