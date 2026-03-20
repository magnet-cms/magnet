import { ScrollArea } from '@magnet-cms/ui'
import { Users } from 'lucide-react'

export function UsersPlaceholder() {
	return (
		<ScrollArea className="h-full flex-1">
			<div className="flex min-h-[400px] flex-col items-center justify-center px-6 py-12 text-center">
				<div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
					<Users className="size-6 text-muted-foreground" />
				</div>
				<h2 className="mb-1 text-sm font-medium text-foreground">Users</h2>
				<p className="max-w-sm text-sm text-muted-foreground">
					Manage users and invitations. This section is coming soon.
				</p>
			</div>
		</ScrollArea>
	)
}
