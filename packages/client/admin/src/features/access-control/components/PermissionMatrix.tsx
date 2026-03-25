import { Input } from '@magnet-cms/ui'
import { Search } from 'lucide-react'
import { useState } from 'react'

import { PermissionGroup as PermissionGroupSection } from './PermissionGroup'

interface Permission {
  id: string
  name: string
  description: string
  checked?: boolean
}

interface PermissionGroup {
  id: string
  name: string
  apiId?: string
  permissions: Permission[]
  isOpen?: boolean
}

interface PermissionMatrixProps {
  collectionTypes: PermissionGroup[]
  controllers?: PermissionGroup[]
  plugins: PermissionGroup[]
  system?: PermissionGroup[]
  onTogglePermission: (groupId: string, permissionId: string) => void
  onToggleSelectAll: (groupId: string) => void
}

export function PermissionMatrix({
  collectionTypes,
  controllers = [],
  plugins,
  system,
  onTogglePermission,
  onToggleSelectAll,
}: PermissionMatrixProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filterGroups = (groups: PermissionGroup[]) => {
    if (!searchQuery) return groups

    return groups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (p) =>
            (p.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.description ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (group.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      }))
      .filter((group) => group.permissions.length > 0)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="w-full space-y-6">
        <div className="group relative">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground group-focus-within:text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for a content type or permission..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm shadow-sm transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          />
        </div>

        {collectionTypes.length > 0 && (
          <PermissionGroupSection
            title="Collection Types"
            groups={filterGroups(collectionTypes)}
            onTogglePermission={onTogglePermission}
            onToggleSelectAll={onToggleSelectAll}
          />
        )}

        {controllers.length > 0 && (
          <PermissionGroupSection
            title="Controllers"
            groups={filterGroups(controllers)}
            onTogglePermission={onTogglePermission}
            onToggleSelectAll={onToggleSelectAll}
          />
        )}

        {system && system.length > 0 && (
          <PermissionGroupSection
            title="System"
            groups={filterGroups(system)}
            onTogglePermission={onTogglePermission}
            onToggleSelectAll={onToggleSelectAll}
          />
        )}

        {plugins.length > 0 && (
          <PermissionGroupSection
            title="Plugins"
            groups={filterGroups(plugins)}
            onTogglePermission={onTogglePermission}
            onToggleSelectAll={onToggleSelectAll}
          />
        )}
      </div>
    </div>
  )
}
