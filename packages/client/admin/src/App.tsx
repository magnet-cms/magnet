import React from 'react'
import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'

const App: React.FC = () => {
	return (
		<div className="min-h-screen bg-background">
			<Routes>
				<Route path="/" element={<HomePage />} />
				<Route path="*" element={<HomePage />} />
			</Routes>
		</div>
	)
}

export default App
