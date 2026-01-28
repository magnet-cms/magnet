import { ScrollArea } from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import { BookOpen, HelpCircle, Info } from 'lucide-react'

interface DocumentationItem {
  id: string
  title: string
  description: string
  icon: typeof BookOpen | typeof HelpCircle | typeof Info
}

const documentationItems: DocumentationItem[] = [
  {
    id: 'configuration',
    title: 'Configuration',
    description:
      'Configure your project settings including display name, environment, and public URL. These settings affect how your project appears and functions.',
    icon: Info,
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description:
      'Manage system preferences like maintenance mode, public logs visibility, and automatic updates. These settings control system behavior and security.',
    icon: HelpCircle,
  },
  {
    id: 'project-identity',
    title: 'Project Identity',
    description:
      'Set your project display name, icon, and environment. The display name appears in dashboards and notifications.',
    icon: BookOpen,
  },
]

interface SettingsDocumentationPanelProps {
  activeSection?: string
}

export function SettingsDocumentationPanel({
  activeSection = 'configuration',
}: SettingsDocumentationPanelProps) {
  const activeItem =
    documentationItems.find((item) => item.id === activeSection) ?? documentationItems[0]!

  return (
    <aside className="w-80 bg-white border-l border-gray-200 hidden md:flex flex-col sticky top-0 h-screen">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Documentation
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <div className="rounded-full bg-gray-100 flex items-center justify-center w-8 h-8">
                  {(() => {
                    const IconComponent = activeItem.icon
                    return <IconComponent className="w-4 h-4 text-gray-600" />
                  })()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">{activeItem.title}</h4>
                <p className="text-xs text-gray-600 leading-relaxed">{activeItem.description}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Help & Resources
            </h4>
            <div className="space-y-3">
              {documentationItems.map((item) => {
                const IconComponent = item.icon
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex gap-3 rounded-lg border transition-colors',
                      activeSection === item.id
                        ? 'border-gray-200 bg-gray-50/50'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                    )}
                  >
                    <div className="shrink-0 mt-0.5 p-2">
                      <div className="rounded-full bg-gray-100 flex items-center justify-center w-6 h-6">
                        <IconComponent className="w-3 h-3 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 py-2 pr-2">
                      <p className="text-xs font-medium text-gray-900">{item.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-blue-900 mb-1">Need Help?</p>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Check our documentation or contact support for assistance with settings
                    configuration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  )
}
