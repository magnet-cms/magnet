import { useNotifications } from '~/contexts/NotificationsContext'
import { NotificationsDrawer as FeatureNotificationsDrawer } from '~/features/notifications'

/**
 * Notification drawer wired to the NotificationsContext (open/close state).
 * Renders the full feature drawer including real notification data.
 */
export const NotificationsDrawer = () => {
  const { isOpen, close } = useNotifications()

  return (
    <FeatureNotificationsDrawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close()
      }}
      showTrigger={false}
    />
  )
}
