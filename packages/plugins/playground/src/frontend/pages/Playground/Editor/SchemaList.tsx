import { useAdmin } from '@magnet-cms/admin'
import { Button, Spinner } from '@magnet-cms/ui/components'
import { names } from '@magnet-cms/utils'
import { Database, Plus } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

export function SchemaList() {
	const navigate = useNavigate()
	const { schemaName } = useParams<{ schemaName: string }>()
	const { schemas, isLoading, error } = useAdmin()

	if (isLoading) {
		return (
			<div className="flex justify-center items-center h-32">
				<Spinner className="h-5 w-5" />
			</div>
		)
	}

	if (error) {
		return <div className="p-3 text-xs text-red-600">Error loading schemas</div>
	}

	const isNewSchema = schemaName === 'new'

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="p-3 border-b">
				<Button
					size="sm"
					className="w-full"
					variant={isNewSchema ? 'default' : 'outline'}
					onClick={() => navigate('/playground/new')}
				>
					<Plus className="h-3.5 w-3.5 mr-1.5" />
					New Schema
				</Button>
			</div>

			{/* Schema List */}
			<div className="flex-1 overflow-y-auto">
				{!schemas || schemas.length === 0 ? (
					<div className="p-4 text-center text-muted-foreground">
						<Database className="mx-auto h-8 w-8 mb-2 opacity-50" />
						<p className="text-xs">No schemas yet</p>
					</div>
				) : (
					<div className="py-1">
						{schemas.map((schema) => {
							const name = names(schema)
							const isSelected = schemaName === name.key
							return (
								<button
									key={schema}
									type="button"
									onClick={() => navigate(`/playground/${name.key}`)}
									className={`w-full text-left px-3 py-2 text-sm transition-colors ${
										isSelected
											? 'bg-accent text-accent-foreground'
											: 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
									}`}
								>
									<div className="font-medium truncate">{name.title}</div>
									<div className="text-xs opacity-70 font-mono truncate">
										{name.key}
									</div>
								</button>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}
