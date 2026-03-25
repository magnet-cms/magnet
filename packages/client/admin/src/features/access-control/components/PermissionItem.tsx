import { cn } from '@magnet-cms/ui/lib/utils'
import { Check } from 'lucide-react'

interface Permission {
  id: string
  name: string
  description: string
  checked?: boolean
}

interface PermissionItemProps {
  permission: Permission
  onToggle: (permissionId: string) => void
}

export function PermissionItem({ permission, onToggle }: PermissionItemProps) {
  return (
    <label className="group flex cursor-pointer items-center gap-3 rounded-md border border-transparent p-2 transition-all hover:border-border hover:bg-muted/50">
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          checked={permission.checked ?? false}
          onChange={() => onToggle(permission.id)}
          className="peer h-4 w-4 appearance-none rounded border border-input bg-background transition-all checked:border-primary checked:bg-primary focus-visible:outline-none"
        />
        <div className="pointer-events-none absolute flex size-4 items-center justify-center rounded transition-all peer-checked:bg-primary peer-checked:border-primary">
          <Check
            className={cn(
              'size-3 text-primary-foreground transition-opacity',
              permission.checked ? 'opacity-100' : 'opacity-0',
            )}
            strokeWidth={3}
          />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{permission.name}</p>
        <p className="text-[10px] text-muted-foreground/80">{permission.description}</p>
      </div>
    </label>
  )
}
