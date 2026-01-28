import { PermissionAccordion } from './PermissionAccordion'

interface Permission {
  id: string
  name: string
  description: string
  checked: boolean
}

interface PermissionGroup {
  id: string
  name: string
  apiId: string
  permissions: Permission[]
  isOpen?: boolean
}

interface PermissionGroupProps {
  title: string
  groups: PermissionGroup[]
  onTogglePermission: (groupId: string, permissionId: string) => void
  onToggleSelectAll: (groupId: string) => void
}

export function PermissionGroup({
  title,
  groups,
  onTogglePermission,
  onToggleSelectAll,
}: PermissionGroupProps) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pl-1">
        {title}
      </h3>
      <div className="space-y-3">
        {groups.map((group) => (
          <PermissionAccordion
            key={group.id}
            group={group}
            onTogglePermission={onTogglePermission}
            onToggleSelectAll={onToggleSelectAll}
          />
        ))}
      </div>
    </div>
  )
}
