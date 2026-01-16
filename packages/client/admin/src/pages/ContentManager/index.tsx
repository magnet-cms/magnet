import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Spinner,
} from '@magnet-cms/ui/components'
import { names } from '@magnet-cms/utils'
import { Database, Globe, Layout, PlusCircle, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '~/contexts/useAdmin'

const ContentManager = () => {
	const navigate = useNavigate()
	const { schemas, isLoading, error } = useAdmin()

	if (isLoading) {
		return (
			<div className="flex justify-center items-center h-64">
				<Spinner />
			</div>
		)
	}

	if (error) {
		return (
			<div className="p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded">
				<h3 className="font-medium">Error loading content types</h3>
				<p className="text-sm">{error.message}</p>
			</div>
		)
	}

	if (!schemas || schemas.length === 0) {
		return (
			<div className="text-center p-12 border rounded-lg text-muted-foreground">
				<Database className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
				<h3 className="text-lg font-medium mb-2">No content types found</h3>
				<p className="mb-6 max-w-md mx-auto">
					You haven't defined any content types yet. Create your first schema to
					get started.
				</p>
				<Button onClick={() => navigate('/settings')}>
					<Settings className="mr-2 h-4 w-4" />
					Go to Settings
				</Button>
			</div>
		)
	}

	return (
		<div className="space-y-8">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">Content Manager</h2>
				<p className="text-muted-foreground">
					Create, edit and manage your content collections
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{schemas.map((schema) => {
					const name = names(schema)
					return (
						<Card key={schema} className="overflow-hidden">
							<CardHeader className="bg-muted/50">
								<CardTitle className="flex items-center">
									<Database className="mr-2 h-5 w-5" />
									{name.title}
								</CardTitle>
								<CardDescription>
									Manage your {name.title.toLowerCase()} content
								</CardDescription>
							</CardHeader>
							<CardContent className="pt-6">
								<div className="grid grid-cols-3 gap-2 text-center text-sm">
									<div className="flex flex-col items-center p-2 rounded-md hover:bg-muted">
										<Layout className="h-8 w-8 mb-1 text-primary" />
										<span>List View</span>
									</div>
									<div className="flex flex-col items-center p-2 rounded-md hover:bg-muted">
										<PlusCircle className="h-8 w-8 mb-1 text-green-500" />
										<span>Create New</span>
									</div>
									<div className="flex flex-col items-center p-2 rounded-md hover:bg-muted">
										<Globe className="h-8 w-8 mb-1 text-blue-500" />
										<span>API</span>
									</div>
								</div>
							</CardContent>
							<CardFooter className="bg-muted/30 flex justify-between">
								<Button
									variant="ghost"
									onClick={() => navigate(`/content-manager/${name.key}`)}
								>
									Browse All
								</Button>
								<Button
									onClick={() =>
										navigate(`/content-manager/${name.key}/create`)
									}
								>
									Create New
								</Button>
							</CardFooter>
						</Card>
					)
				})}
			</div>
		</div>
	)
}

export default ContentManager
