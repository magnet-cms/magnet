import { Button } from '@magnet/ui/components'
import React from 'react'

const HomePage: React.FC = () => {
	return (
		<div className="container mx-auto p-6">
			<h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<div className="bg-card p-6 rounded-lg shadow">
					<h2 className="text-xl font-semibold mb-2">Welcome</h2>
					<p className="text-muted-foreground">
						This is your admin dashboard. You can manage your application from
						here.
					</p>

					<Button variant="outline">Click me</Button>
				</div>
			</div>
		</div>
	)
}

export default HomePage
