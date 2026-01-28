import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import { Check } from 'lucide-react'

import { PermissionItem } from './PermissionItem'

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

interface PermissionAccordionProps {
  group: PermissionGroup
  onTogglePermission: (groupId: string, permissionId: string) => void
  onToggleSelectAll: (groupId: string) => void
}

export function PermissionAccordion({
  group,
  onTogglePermission,
  onToggleSelectAll,
}: PermissionAccordionProps) {
  const allChecked = group.permissions.every((p) => p.checked)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <Accordion type="single" collapsible defaultValue={group.isOpen ? group.id : undefined}>
        <AccordionItem value={group.id} className="border-0">
          <AccordionTrigger className="px-4 py-3 bg-gray-50/50 hover:bg-gray-50 border-b border-gray-100 hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">{group.name}</span>
                <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                  {group.apiId}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <label
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={() => onToggleSelectAll(group.id)}
                      className="peer appearance-none h-4 w-4 rounded border border-gray-300 bg-white checked:bg-gray-900 checked:border-gray-900 focus:outline-none transition-all"
                    />
                    <div className="absolute pointer-events-none rounded w-4 h-4 flex items-center justify-center transition-all peer-checked:bg-gray-900 peer-checked:border-gray-900">
                      <Check
                        className={cn(
                          'w-3 h-3 text-white transition-opacity',
                          allChecked ? 'opacity-100' : 'opacity-0'
                        )}
                        strokeWidth={3}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 group-hover:text-gray-700 select-none">
                    Select All
                  </span>
                </label>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white">
              {group.permissions.map((permission) => (
                <PermissionItem
                  key={permission.id}
                  permission={permission}
                  onToggle={(permissionId) => onTogglePermission(group.id, permissionId)}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
