import { cn } from '@magnet-cms/ui/lib/utils'

export type SettingsSectionId = 'configuration'

interface SettingsItem {
  id: SettingsSectionId
  name: string
  apiId: string
}

const settingsItems: SettingsItem[] = [
  { id: 'configuration', name: 'Configuration', apiId: 'configuration' },
]

interface SettingsListProps {
  activeId: SettingsSectionId
  onSelect: (id: SettingsSectionId) => void
}

export function SettingsList({ activeId, onSelect }: SettingsListProps) {
  return (
    <div className="w-56 bg-white border-r border-gray-200 flex flex-col hidden lg:flex">
      <div className="flex-1 overflow-y-auto px-2 pt-4 pb-4 space-y-0.5">
        {settingsItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-md group transition-colors',
              activeId === item.id ? 'bg-gray-50' : 'hover:bg-gray-50'
            )}
          >
            <p className="text-sm font-medium text-gray-600 group-hover:text-gray-900">
              {item.name}
            </p>
            <p className="text-xs text-gray-400 font-mono mt-0.5 group-hover:text-gray-500">
              {item.apiId}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
