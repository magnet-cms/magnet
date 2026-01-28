import { cn } from '@magnet-cms/ui/lib/utils'
import { Code2, FileJson, LayoutTemplate } from 'lucide-react'

type ViewType = 'builder' | 'json' | 'code'

interface ViewTabsProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

export function ViewTabs({ activeView, onViewChange }: ViewTabsProps) {
  const views: { id: ViewType; label: string; icon: typeof LayoutTemplate }[] = [
    { id: 'builder', label: 'Builder', icon: LayoutTemplate },
    { id: 'json', label: 'JSON', icon: FileJson },
    { id: 'code', label: 'Code', icon: Code2 },
  ]

  return (
    <div className="hidden md:flex items-center bg-gray-100 p-1 rounded-lg">
      {views.map((view) => {
        const Icon = view.icon
        const isActive = activeView === view.id
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-2',
              isActive ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {view.label}
          </button>
        )
      })}
    </div>
  )
}
