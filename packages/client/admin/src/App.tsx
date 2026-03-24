import { ThemeProvider } from 'next-themes'
import { ThemeRootSync } from './components/ThemeRootSync'
import { DialogProvider } from './core/dialog'
import { MagnetProvider } from './core/provider/MagnetProvider'
import { MagnetRouter } from './core/router/MagnetRouter'
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

/**
 * App component for development and standalone production mode.
 * Uses createBrowserRouter (data router) via MagnetRouter so that
 * hooks like useBlocker work correctly.
 */
const App = () => {
	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<ThemeRootSync>
				<AppIntlProvider>
					<MagnetProvider config={{ apiBaseUrl, basePath }}>
						<DialogProvider>
							<MagnetRouter
								type="browser"
								routes={routes}
								basePath={basePath}
							/>
						</DialogProvider>
					</MagnetProvider>
				</AppIntlProvider>
			</ThemeRootSync>
		</ThemeProvider>
	)
}

export default App
