import { BrowserRouter, useRoutes } from 'react-router-dom'
import { MagnetProvider } from './core/provider/MagnetProvider'
import { routes } from './routes/index.tsx'

import './styles/global.css'

// BASE_URL is set by Vite from the 'base' config option
// Remove trailing slash for React Router basename compatibility
const rawBasePath = import.meta.env.BASE_URL || '/admin/'
const basePath = rawBasePath.endsWith('/')
	? rawBasePath.slice(0, -1)
	: rawBasePath
const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const AppRoutes = () => {
	const element = useRoutes(routes)
	return element
}

/**
 * App component for development mode
 * Uses BrowserRouter with useRoutes for hot-reloading support
 *
 * For production/library usage, use MagnetAdmin component instead
 * which uses createBrowserRouter and RouterProvider
 */
const App = () => {
	return (
		<MagnetProvider config={{ apiBaseUrl, basePath }}>
			<BrowserRouter basename={basePath}>
				<AppRoutes />
			</BrowserRouter>
		</MagnetProvider>
	)
}

export default App
