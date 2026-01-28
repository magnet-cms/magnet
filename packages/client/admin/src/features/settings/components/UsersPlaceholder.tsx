import { ScrollArea } from '@magnet-cms/ui'
import { Users } from 'lucide-react'

export function UsersPlaceholder() {
  return (
    <ScrollArea className="flex-1 h-full">
      <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Users className="w-6 h-6 text-gray-400" />
        </div>
        <h2 className="text-sm font-medium text-gray-900 mb-1">Users</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Manage users and invitations. This section is coming soon.
        </p>
      </div>
    </ScrollArea>
  )
}
