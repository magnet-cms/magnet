import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'

// Import plugin frontends BEFORE App to ensure routes are registered
// before routes/index.tsx calls getRegisteredPluginRoutes()
import '@magnet/plugin-content-builder/frontend'

import App from './App'

const rootElement = document.getElementById('root')
if (!rootElement) {
	throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
)
