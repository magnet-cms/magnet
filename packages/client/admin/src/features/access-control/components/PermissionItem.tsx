import { cn } from '@magnet-cms/ui/lib/utils'
import { Check } from 'lucide-react'

interface Permission {
  id: string
  name: string
  description: string
  checked: boolean
}

interface PermissionItemProps {
  permission: Permission
  onToggle: (permissionId: string) => void
}

export function PermissionItem({ permission, onToggle }: PermissionItemProps) {
  return (
    <label className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer group border border-transparent hover:border-gray-100 transition-all">
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          checked={permission.checked}
          onChange={() => onToggle(permission.id)}
          className="peer appearance-none h-4 w-4 rounded border border-gray-300 bg-white checked:bg-gray-900 checked:border-gray-900 focus:outline-none transition-all"
        />
        <div className="absolute pointer-events-none rounded w-4 h-4 flex items-center justify-center transition-all peer-checked:bg-gray-900 peer-checked:border-gray-900">
          <Check
            className={cn(
              'w-3 h-3 text-white transition-opacity',
              permission.checked ? 'opacity-100' : 'opacity-0'
            )}
            strokeWidth={3}
          />
        </div>
      </div>
      <div>
        <p className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">
          {permission.name}
        </p>
        <p className="text-[10px] text-gray-400">{permission.description}</p>
      </div>
    </label>
  )
}
