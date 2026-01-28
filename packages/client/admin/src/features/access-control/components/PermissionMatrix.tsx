import { Input } from '@magnet-cms/ui'
import { Search } from 'lucide-react'
import { useState } from 'react'

import { PermissionGroup } from './PermissionGroup'

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

interface PermissionMatrixProps {
  collectionTypes: PermissionGroup[]
  plugins: PermissionGroup[]
  onTogglePermission: (groupId: string, permissionId: string) => void
  onToggleSelectAll: (groupId: string) => void
}

export function PermissionMatrix({
  collectionTypes,
  plugins,
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
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            group.name.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((group) => group.permissions.length > 0)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="w-full space-y-6">
        {/* Search Filter */}
        <div className="relative group">
          <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-gray-600 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search for a content type or permission..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all placeholder:text-gray-400"
          />
        </div>

        <PermissionGroup
          title="Collection Types"
          groups={filterGroups(collectionTypes)}
          onTogglePermission={onTogglePermission}
          onToggleSelectAll={onToggleSelectAll}
        />

        <PermissionGroup
          title="Plugins"
          groups={filterGroups(plugins)}
          onTogglePermission={onTogglePermission}
          onToggleSelectAll={onToggleSelectAll}
        />
      </div>
    </div>
  )
}
