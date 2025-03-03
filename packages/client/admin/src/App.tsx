import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, useRoutes } from 'react-router-dom'
import { AdminProvider } from './contexts/useAdmin'
import { routes } from './routes/index.tsx'

import './styles/global.css'

const queryClient = new QueryClient()

const basePath = import.meta.env.VITE_BASE_PATH

const AppRoutes = () => {
	const element = useRoutes(routes)
	return element
}

const App = () => {
	return (
		<BrowserRouter
			basename={basePath}
			future={{
				v7_startTransition: true,
			}}
		>
			<QueryClientProvider client={queryClient}>
				<AdminProvider>
					<AppRoutes />
				</AdminProvider>
			</QueryClientProvider>
		</BrowserRouter>
	)
}

export default App
