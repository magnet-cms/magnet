import { Button, Skeleton } from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '../../shared'

import { DuplicateRoleDialog } from './DuplicateRoleDialog'
import { InfoPanel } from './InfoPanel'
import { PermissionMatrix } from './PermissionMatrix'
import { RoleHeader } from './RoleHeader'

import {
  type PermissionGroup as PermissionGroupType,
  useRole,
  useRoleDuplicate,
  useUpdateRolePermissions,
} from '~/hooks/useRoles'
import { useAppIntl } from '~/i18n'

export function AccessControlPage() {
  const intl = useAppIntl()
  const { role: roleId = '' } = useParams<{ role: string }>()
  const navigate = useNavigate()

  const { data: roleData, isLoading, error, refetch } = useRole(roleId)
  const { mutate: updatePermissions, isPending: isSaving } = useUpdateRolePermissions()
  const { mutate: duplicateRole } = useRoleDuplicate()

  const [collectionTypes, setCollectionTypes] = useState<PermissionGroupType[]>([])
  const [controllers, setControllers] = useState<PermissionGroupType[]>([])
  const [plugins, setPlugins] = useState<PermissionGroupType[]>([])
  const [system, setSystem] = useState<PermissionGroupType[]>([])
  const [activeTab, setActiveTab] = useState<'permissions' | 'advanced'>('permissions')
  const [duplicateOpen, setDuplicateOpen] = useState(false)

  // Initialize local state from API data
  useEffect(() => {
    if (roleData) {
      setCollectionTypes(roleData.collectionTypes)
      setControllers(roleData.controllers ?? [])
      setPlugins(roleData.plugins)
      setSystem(roleData.system)
    }
  }, [roleData])

  const handleTogglePermission = useCallback((groupId: string, permissionId: string) => {
    const updateGroup = (groups: PermissionGroupType[]) =>
      groups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            permissions: group.permissions.map((p) =>
              p.id === permissionId ? { ...p, checked: !p.checked } : p,
            ),
          }
        }
        return group
      })

    setCollectionTypes((prev) => updateGroup(prev))
    setControllers((prev) => updateGroup(prev))
    setPlugins((prev) => updateGroup(prev))
    setSystem((prev) => updateGroup(prev))
  }, [])

  const handleToggleSelectAll = useCallback((groupId: string) => {
    const updateGroup = (groups: PermissionGroupType[]) =>
      groups.map((group) => {
        if (group.id === groupId) {
          const allChecked = group.permissions.every((p) => p.checked)
          return {
            ...group,
            permissions: group.permissions.map((p) => ({
              ...p,
              checked: !allChecked,
            })),
          }
        }
        return group
      })

    setCollectionTypes((prev) => updateGroup(prev))
    setControllers((prev) => updateGroup(prev))
    setPlugins((prev) => updateGroup(prev))
    setSystem((prev) => updateGroup(prev))
  }, [])

  // Collect all checked permission IDs from all groups
  const collectCheckedPermissions = useCallback((): string[] => {
    const permissions: string[] = []

    const collectFrom = (groups: PermissionGroupType[]) => {
      for (const group of groups) {
        for (const perm of group.permissions) {
          if (perm.checked) {
            permissions.push(perm.id)
          }
        }
      }
    }

    collectFrom(collectionTypes)
    collectFrom(controllers)
    collectFrom(plugins)
    collectFrom(system)

    return permissions
  }, [collectionTypes, controllers, plugins, system])

  const handleSave = useCallback(() => {
    if (!roleData) return

    const permissions = collectCheckedPermissions()

    updatePermissions(
      { id: roleData.id, permissions },
      {
        onSuccess: () => {
          toast.success(
            intl.formatMessage({
              id: 'accessControl.updateSuccess',
              defaultMessage: 'Permissions saved successfully',
            }),
          )
          refetch()
        },
        onError: (err) => {
          toast.error(
            err.message ||
              intl.formatMessage({
                id: 'accessControl.updateError',
                defaultMessage: 'Failed to save permissions',
              }),
          )
        },
      },
    )
  }, [roleData, collectCheckedPermissions, updatePermissions, refetch])

  const handleDuplicate = useCallback(
    (data: { name: string; displayName?: string }) => {
      if (!roleData) return

      duplicateRole(
        { id: roleData.id, data },
        {
          onSuccess: (newRole) => {
            toast.success(
              `Role duplicated as "${data.displayName || `Copy of ${roleData.displayName}`}"`,
            )
            setDuplicateOpen(false)
            navigate(`/access-control/${newRole.id}`)
          },
          onError: (err) => {
            toast.error(
              err.message ||
                intl.formatMessage({
                  id: 'accessControl.duplicateError',
                  defaultMessage: 'Failed to duplicate role',
                }),
            )
          },
        },
      )
    },
    [roleData, duplicateRole, navigate],
  )

  // Compute user count from role data
  // Note: The detailed role API doesn't return userCount, but we can show
  // the count from the listing if navigating from there, or omit it.
  const dependentCount = useMemo(() => {
    // The RoleWithPermissions doesn't include userCount,
    // so we show 0 and it gets populated from the list view's cache
    return 0
  }, [])

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
        <PageHeader>
          <div className="h-16 flex items-center justify-between px-6">
            <div>
              <Skeleton className="h-6 w-48 mb-1" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
          <div className="w-full px-6 border-b border-border flex items-end gap-6">
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-8 w-32 mb-1" />
          </div>
        </PageHeader>
        <div className="flex-1 p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (error || !roleData) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
        <PageHeader>
          <div className="h-16 flex items-center justify-between px-6">
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">Role Details</h1>
              <p className="text-xs text-muted-foreground">Manage permissions for this role.</p>
            </div>
          </div>
        </PageHeader>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{error?.message || 'Failed to load role'}</p>
            <div className="flex items-center gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/access-control')}>
                Back to Roles
              </Button>
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background h-full relative overflow-hidden">
      <PageHeader>
        <RoleHeader
          roleName={roleData.displayName}
          roleDescription={roleData.description || ''}
          onSave={handleSave}
          onDuplicate={() => setDuplicateOpen(true)}
        />

        <div className="flex items-center gap-6 overflow-x-auto border-b border-border border-t border-border px-8">
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={cn(
              'whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors',
              activeTab === 'permissions'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
            )}
          >
            Permissions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={cn(
              'whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors',
              activeTab === 'advanced'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
            )}
          >
            Advanced Settings
          </button>
        </div>
      </PageHeader>

      {activeTab === 'permissions' && (
        <div className="relative flex flex-1 overflow-hidden bg-muted/50">
          <PermissionMatrix
            collectionTypes={collectionTypes}
            controllers={controllers}
            plugins={plugins}
            system={system}
            onTogglePermission={handleTogglePermission}
            onToggleSelectAll={handleToggleSelectAll}
          />

          <InfoPanel
            roleName={roleData.displayName}
            dependentCount={dependentCount}
            auditLog={[]}
          />
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="flex flex-1 items-center justify-center bg-muted/50">
          <p className="text-sm text-muted-foreground">Advanced settings coming soon.</p>
        </div>
      )}

      {isSaving && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
          <p className="text-sm text-muted-foreground">Saving permissions...</p>
        </div>
      )}

      <DuplicateRoleDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        sourceRoleName={roleData.displayName}
        onDuplicate={handleDuplicate}
      />
    </div>
  )
}
