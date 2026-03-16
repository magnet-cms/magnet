import { ThemeProvider, useTheme } from 'next-themes'
import type { ReactNode } from 'react'
import { BrowserRouter, useRoutes } from 'react-router-dom'
import { DialogProvider } from './core/dialog'
import { MagnetProvider } from './core/provider/MagnetProvider'
import { AppIntlProvider } from './i18n'
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
 * Wraps the app with the active theme class so Tailwind dark: variants apply.
 * next-themes sets the class on html, but we also apply it here as a fallback
 * for environments where that may not work reliably.
 */
function ThemeClassWrapper({ children }: { children: ReactNode }) {
	const { resolvedTheme } = useTheme()
	return (
		<div
			className={resolvedTheme === 'dark' ? 'dark' : ''}
			style={{ minHeight: '100vh' }}
		>
			{children}
		</div>
	)
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
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<ThemeClassWrapper>
				<AppIntlProvider>
					<MagnetProvider config={{ apiBaseUrl, basePath }}>
						<DialogProvider>
							<BrowserRouter basename={basePath}>
								<AppRoutes />
							</BrowserRouter>
						</DialogProvider>
					</MagnetProvider>
				</AppIntlProvider>
			</ThemeClassWrapper>
		</ThemeProvider>
	)
}

export default App
