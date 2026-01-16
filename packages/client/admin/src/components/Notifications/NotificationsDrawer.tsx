import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@magnet-cms/ui/components'
import { Bell } from 'lucide-react'
import { useNotifications } from '~/contexts/NotificationsContext'

export const NotificationsDrawer = () => {
	const { isOpen, close } = useNotifications()

	return (
		<Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>Notifications</SheetTitle>
					<SheetDescription>
						Stay updated with the latest activity
					</SheetDescription>
				</SheetHeader>
				<div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
					<div className="rounded-full bg-muted p-4">
						<Bell className="h-8 w-8 text-muted-foreground" />
					</div>
					<div className="space-y-1">
						<p className="text-sm font-medium">No notifications yet</p>
						<p className="text-sm text-muted-foreground">
							When you have notifications, they will appear here.
						</p>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	)
}
