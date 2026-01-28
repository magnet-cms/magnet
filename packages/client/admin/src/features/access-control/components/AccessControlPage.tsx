import { cn } from '@magnet-cms/ui/lib/utils'
import { useState } from 'react'

import { PageHeader } from '../../shared'

import { InfoPanel, PermissionMatrix, RoleHeader } from './index'

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

// Mock data
const mockCollectionTypes: PermissionGroup[] = [
  {
    id: 'address',
    name: 'Address',
    apiId: 'api::address',
    isOpen: true,
    permissions: [
      { id: 'find', name: 'find', description: 'Get a list of addresses', checked: true },
      { id: 'findOne', name: 'findOne', description: 'Get a specific address', checked: true },
      { id: 'create', name: 'create', description: 'Create a new address', checked: false },
      { id: 'update', name: 'update', description: 'Update an address', checked: false },
      { id: 'delete', name: 'delete', description: 'Delete an address', checked: false },
    ],
  },
  {
    id: 'order',
    name: 'Order',
    apiId: 'api::order',
    permissions: [
      { id: 'find', name: 'find', description: 'Get a list of orders', checked: false },
      { id: 'findOne', name: 'findOne', description: 'Get a specific order', checked: false },
      { id: 'create', name: 'create', description: 'Create a new order', checked: false },
      { id: 'update', name: 'update', description: 'Update an order', checked: false },
      { id: 'delete', name: 'delete', description: 'Delete an order', checked: false },
    ],
  },
  {
    id: 'product',
    name: 'Product',
    apiId: 'api::product',
    permissions: [
      { id: 'find', name: 'find', description: 'Get a list of products', checked: true },
      { id: 'findOne', name: 'findOne', description: 'Get a specific product', checked: true },
      { id: 'create', name: 'create', description: 'Create a new product', checked: false },
      { id: 'update', name: 'update', description: 'Update a product', checked: false },
      { id: 'delete', name: 'delete', description: 'Delete a product', checked: false },
    ],
  },
]

const mockPlugins: PermissionGroup[] = [
  {
    id: 'users-permissions',
    name: 'Users-Permissions',
    apiId: 'plugin::users-permissions',
    permissions: [
      { id: 'user-find', name: 'user.find', description: 'Find users', checked: false },
      { id: 'user-create', name: 'user.create', description: 'Create users', checked: false },
    ],
  },
  {
    id: 'upload',
    name: 'Upload',
    apiId: 'plugin::upload',
    permissions: [
      { id: 'upload-find', name: 'upload.find', description: 'Find uploads', checked: true },
      { id: 'upload-create', name: 'upload.create', description: 'Create uploads', checked: true },
    ],
  },
]

const mockAuditLog = [
  {
    id: '1',
    action: 'Updated Address permissions',
    timestamp: '2 hours ago by You',
    user: 'You',
  },
  {
    id: '2',
    action: 'Created role',
    timestamp: '2 days ago by Admin',
    user: 'Admin',
  },
]

interface AccessControlPageProps {
  roleId?: string
}

export function AccessControlPage({ roleId = 'authenticated' }: AccessControlPageProps) {
  const [collectionTypes, setCollectionTypes] = useState(mockCollectionTypes)
  const [plugins, setPlugins] = useState(mockPlugins)
  const [activeTab, setActiveTab] = useState<'permissions' | 'advanced'>('permissions')

  const handleTogglePermission = (groupId: string, permissionId: string) => {
    const updateGroup = (groups: PermissionGroup[]) =>
      groups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            permissions: group.permissions.map((p) =>
              p.id === permissionId ? { ...p, checked: !p.checked } : p
            ),
          }
        }
        return group
      })

    setCollectionTypes(updateGroup(collectionTypes))
    setPlugins(updateGroup(plugins))
  }

  const handleToggleSelectAll = (groupId: string) => {
    const updateGroup = (groups: PermissionGroup[]) =>
      groups.map((group) => {
        if (group.id === groupId) {
          const allChecked = group.permissions.every((p) => p.checked)
          return {
            ...group,
            permissions: group.permissions.map((p) => ({ ...p, checked: !allChecked })),
          }
        }
        return group
      })

    setCollectionTypes(updateGroup(collectionTypes))
    setPlugins(updateGroup(plugins))
  }

  const handleSave = () => {
    console.log('Saving permissions...')
    // In a real app, this would save to the server
  }

  const handleDuplicate = () => {
    console.log('Duplicating role...')
    // In a real app, this would duplicate the role
  }

  // Get role name and description based on roleId
  // In a real app, this would fetch from an API
  const getRoleInfo = (id: string) => {
    const roleMap: Record<string, { name: string; description: string }> = {
      authenticated: {
        name: 'Authenticated Role',
        description: 'Default role given to authenticated users.',
      },
      public: {
        name: 'Public Role',
        description: 'Default role for unauthenticated users.',
      },
      admin: {
        name: 'Admin Role',
        description: 'Full access to all features and settings.',
      },
      editor: {
        name: 'Editor Role',
        description: 'Can create and edit content, but cannot delete.',
      },
      viewer: {
        name: 'Viewer Role',
        description: 'Read-only access to content.',
      },
    }
    return (
      roleMap[id] || {
        name: `${id.charAt(0).toUpperCase() + id.slice(1)} Role`,
        description: 'Custom role configuration.',
      }
    )
  }

  const roleInfo = getRoleInfo(roleId)

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
      {/* Header */}
      <PageHeader>
        <RoleHeader
          roleName={roleInfo.name}
          roleDescription={roleInfo.description}
          onSave={handleSave}
          onDuplicate={handleDuplicate}
        />

        {/* Context Tabs */}
        <div className="w-full px-6 border-b border-gray-200 flex items-end gap-6">
          <button
            onClick={() => setActiveTab('permissions')}
            className={cn(
              'pb-3 text-xs font-medium border-b-2 transition-colors',
              activeTab === 'permissions'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Permissions
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={cn(
              'pb-3 text-xs font-medium border-b-2 transition-colors',
              activeTab === 'advanced'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Advanced Settings
          </button>
        </div>
      </PageHeader>

      {/* Permissions Content */}
      <div className="flex-1 flex overflow-hidden relative bg-gray-50">
        <PermissionMatrix
          collectionTypes={collectionTypes}
          plugins={plugins}
          onTogglePermission={handleTogglePermission}
          onToggleSelectAll={handleToggleSelectAll}
        />

        <InfoPanel
          roleName={roleInfo.name.replace(' Role', '')}
          dependentCount={1240}
          auditLog={mockAuditLog}
        />
      </div>
    </div>
  )
}
