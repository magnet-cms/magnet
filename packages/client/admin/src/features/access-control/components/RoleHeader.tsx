import { Button } from '@magnet-cms/ui'
import { Copy, Save } from 'lucide-react'

interface RoleHeaderProps {
  roleName: string
  roleDescription: string
  onSave: () => void
  onDuplicate: () => void
}

export function RoleHeader({ roleName, roleDescription, onSave, onDuplicate }: RoleHeaderProps) {
  return (
    <div className="h-16 flex items-center justify-between px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">{roleName}</h1>
        <p className="text-xs text-muted-foreground">{roleDescription}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="hidden sm:flex" onClick={onDuplicate}>
          <Copy className="w-3.5 h-3.5" />
          Duplicate Role
        </Button>
        <Button size="sm" onClick={onSave}>
          <Save className="w-3.5 h-3.5" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
