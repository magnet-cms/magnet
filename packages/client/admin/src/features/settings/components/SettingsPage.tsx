import { Button } from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import { Loader2, Save } from 'lucide-react'
import { useRef, useState } from 'react'

import { PageHeader } from '../../shared'

import { type ConfigurationFormRef, ConfigurationForm, SettingsDocumentationPanel } from './index'

type SettingsTab = 'configuration'

export function SettingsPage() {
  const configFormRef = useRef<ConfigurationFormRef>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('configuration')

  const handleSave = async () => {
    setSaving(true)
    try {
      await configFormRef.current?.save()
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    configFormRef.current?.reset()
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
      <PageHeader>
        <div className="h-16 flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">General Settings</h1>
            <p className="text-xs text-gray-500">
              Manage your project&apos;s main configuration and preferences.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </PageHeader>

      {/* Tabs */}
      <header className="shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-md z-20 sticky top-0">
        <div className="px-8 flex items-center gap-6 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('configuration')}
            className={cn(
              'py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'configuration'
                ? 'text-gray-900 border-gray-900'
                : 'text-gray-500 hover:text-gray-900 border-transparent hover:border-gray-200'
            )}
          >
            Configuration
          </button>
        </div>
      </header>

      {/* Content Body */}
      <div className="flex-1 flex overflow-hidden bg-gray-50/50">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8 pb-10">
            <ConfigurationForm ref={configFormRef} />
          </div>
        </div>
        {/* Fixed Right Sidebar - Documentation */}
        <SettingsDocumentationPanel activeSection={activeTab} />
      </div>
    </div>
  )
}
