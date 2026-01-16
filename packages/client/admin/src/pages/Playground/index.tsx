import { Button, Card, CardContent, Spinner } from '@magnet/ui/components'
import { names } from '@magnet/utils'
import { ChevronRight, Database, Info, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '~/contexts/useAdmin'

const Playground = () => {
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
				<h3 className="font-medium">Error loading schemas</h3>
				<p className="text-sm">{error.message}</p>
			</div>
		)
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">
						Schema Playground
					</h2>
					<p className="text-muted-foreground">
						Create and edit content schemas visually, then deploy them to code
					</p>
				</div>
				<Button onClick={() => navigate('/playground/new')}>
					<Plus className="mr-2 h-4 w-4" />
					Create Schema
				</Button>
			</div>

			{/* Info Banner */}
			<div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3 dark:bg-blue-950/30 dark:border-blue-900">
				<Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
				<div className="text-sm text-blue-900 dark:text-blue-100">
					<p className="font-medium mb-1">Visual Schema Builder</p>
					<p className="text-blue-700 dark:text-blue-300">
						Design your content schemas using a drag-and-drop interface. When
						you deploy, TypeScript code files with decorators will be generated
						in your project.
					</p>
				</div>
			</div>

			{/* Schema List */}
			{!schemas || schemas.length === 0 ? (
				<div className="text-center p-12 border rounded-lg text-muted-foreground">
					<Database className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
					<h3 className="text-lg font-medium mb-2">No schemas found</h3>
					<p className="mb-6 max-w-md mx-auto">
						You haven't defined any content schemas yet. Create your first
						schema to get started.
					</p>
					<Button onClick={() => navigate('/playground/new')}>
						<Plus className="mr-2 h-4 w-4" />
						Create Your First Schema
					</Button>
				</div>
			) : (
				<div className="flex flex-col gap-3">
					{schemas.map((schema) => {
						const name = names(schema)
						return (
							<Card
								key={schema}
								className="w-full cursor-pointer hover:bg-accent/50 transition-colors"
								onClick={() => navigate(`/playground/${name.key}`)}
							>
								<CardContent className="flex items-center justify-between py-4 px-6">
									<div>
										<h3 className="font-medium text-base">{name.title}</h3>
										<p className="text-sm text-muted-foreground font-mono">
											api::{name.key}.{name.key}
										</p>
									</div>
									<ChevronRight className="h-5 w-5 text-muted-foreground" />
								</CardContent>
							</Card>
						)
					})}
				</div>
			)}
		</div>
	)
}

export default Playground
