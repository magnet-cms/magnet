'use client'

import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
} from '@magnet-cms/ui'
import { Box, SlidersHorizontal, Trash2 } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { toast } from 'sonner'

import { useSettingData, useSettingMutation } from '~/hooks/useSetting'

export interface ConfigurationFormRef {
  reset: () => void
  save: () => Promise<void>
}

// Settings data structure
interface GeneralSettings extends Record<string, unknown> {
  displayName?: string
  environment?: string
  publicUrl?: string
  maintenanceMode?: boolean
  publicLogs?: boolean
  autoUpdates?: boolean
}

// Default values
const defaultSettings: GeneralSettings = {
  displayName: 'Magnet Project',
  environment: 'development',
  publicUrl: '',
  maintenanceMode: false,
  publicLogs: true,
  autoUpdates: false,
}

export const ConfigurationForm = forwardRef<ConfigurationFormRef, object>(
  function ConfigurationForm(_props, ref) {
    const { data: settingsData, isLoading, error, refetch } = useSettingData<GeneralSettings>('general')
    const { mutate: updateSettings, isPending: isSaving } = useSettingMutation<GeneralSettings>('general')

    // Local form state
    const [formState, setFormState] = useState<GeneralSettings>(defaultSettings)
    const [hasChanges, setHasChanges] = useState(false)

    // Sync form state with loaded settings
    useEffect(() => {
      if (settingsData && settingsData.length > 0) {
        // Merge all settings into a single object
        const mergedSettings = settingsData.reduce(
          (acc, item) => ({ ...acc, ...item }),
          {} as GeneralSettings
        )
        setFormState({
          ...defaultSettings,
          ...mergedSettings,
        })
        setHasChanges(false)
      }
    }, [settingsData])

    // Update form field
    const updateField = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
      setFormState((prev) => ({ ...prev, [key]: value }))
      setHasChanges(true)
    }

    const handleReset = () => {
      if (settingsData && settingsData.length > 0) {
        const mergedSettings = settingsData.reduce(
          (acc, item) => ({ ...acc, ...item }),
          {} as GeneralSettings
        )
        setFormState({
          ...defaultSettings,
          ...mergedSettings,
        })
      } else {
        setFormState(defaultSettings)
      }
      setHasChanges(false)
    }

    const handleSave = async () => {
      return new Promise<void>((resolve, reject) => {
        updateSettings(formState, {
          onSuccess: () => {
            toast.success('Settings saved successfully')
            setHasChanges(false)
            refetch()
            resolve()
          },
          onError: (err) => {
            toast.error(err.message || 'Failed to save settings')
            reject(err)
          },
        })
      })
    }

    useImperativeHandle(ref, () => ({
      reset: handleReset,
      save: handleSave,
    }))

    const handleDeleteProject = () => {
      if (window.confirm('Are you sure you want to delete this project? This cannot be undone.')) {
        toast.info('Project deletion is not available yet')
      }
    }

    // Loading state
    if (isLoading) {
      return (
        <div className="space-y-8">
          <Card className="border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <Skeleton className="h-5 w-32" />
            </div>
            <CardContent className="px-6 pb-6 space-y-6">
              <Skeleton className="h-16 w-full" />
              <div className="grid grid-cols-2 gap-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Error state - show form with defaults
    if (error) {
      toast.error('Failed to load settings. Using defaults.')
    }

    return (
      <div className="space-y-8">
        {/* Section: Project Identity */}
        <Card className="border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Box className="w-[18px] h-[18px] text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Project Identity</h2>
            {hasChanges && (
              <span className="ml-auto text-xs text-amber-600 font-medium">Unsaved changes</span>
            )}
          </div>
          <CardContent className="px-6 pb-6 space-y-6">
            {/* Logo Upload */}
            <div className="flex items-center gap-6">
              <button type="button" className="relative group cursor-pointer rounded-full">
                <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 overflow-hidden group-hover:border-gray-300 transition-colors">
                  <Box className="w-8 h-8 text-gray-300" />
                </div>
                <div className="absolute inset-0 rounded-full bg-gray-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium">Upload</span>
                </div>
              </button>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Project Icon</h3>
                <p className="text-xs text-gray-500 mt-1">
                  This icon will be displayed on your dashboard.
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Upload New
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="col-span-1 space-y-1.5">
                <Label htmlFor="project-name" className="text-xs font-medium text-gray-700">
                  Display Name
                </Label>
                <Input
                  id="project-name"
                  type="text"
                  value={formState.displayName || ''}
                  onChange={(e) => updateField('displayName', e.target.value)}
                  className="rounded-lg border-gray-200 bg-gray-50/50"
                />
              </div>
              <div className="col-span-1 space-y-1.5">
                <Label htmlFor="env" className="text-xs font-medium text-gray-700">
                  Environment
                </Label>
                <Select
                  value={formState.environment || 'development'}
                  onValueChange={(value) => updateField('environment', value)}
                >
                  <SelectTrigger
                    id="env"
                    className="w-full rounded-lg border-gray-200 bg-gray-50/50 h-[42px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="url" className="text-xs font-medium text-gray-700">
                  Public URL
                </Label>
                <div className="flex rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-200">
                    https://
                  </span>
                  <Input
                    id="url"
                    type="text"
                    value={formState.publicUrl || ''}
                    onChange={(e) => updateField('publicUrl', e.target.value)}
                    className="rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="api.myservice.com"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  The primary URL used for API responses and callbacks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section: Preferences */}
        <Card className="border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <SlidersHorizontal className="w-[18px] h-[18px] text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Preferences</h2>
          </div>
          <div className="px-6 pb-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Maintenance Mode</p>
                <p className="text-xs text-gray-500 mt-0.5">Disable public access to the API.</p>
              </div>
              <Switch
                checked={formState.maintenanceMode || false}
                onCheckedChange={(checked) => updateField('maintenanceMode', checked)}
              />
            </div>
            <hr className="border-gray-100" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Public Logs</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Allow unauthenticated users to view system status.
                </p>
              </div>
              <Switch
                checked={formState.publicLogs || false}
                onCheckedChange={(checked) => updateField('publicLogs', checked)}
              />
            </div>
            <hr className="border-gray-100" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Automatic Updates</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Install security patches automatically.
                </p>
              </div>
              <Switch
                checked={formState.autoUpdates || false}
                onCheckedChange={(checked) => updateField('autoUpdates', checked)}
              />
            </div>
          </div>
        </Card>

        {/* Section: Danger Zone */}
        <Card className="border border-red-200 bg-red-50/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100 flex items-center gap-2">
            <span className="text-red-500 font-bold">!</span>
            <h2 className="text-sm font-semibold text-red-900">Danger Zone</h2>
          </div>
          <div className="px-6 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Delete Project</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                Once you delete a project, there is no going back. Please be certain.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300 w-full sm:w-auto"
              onClick={handleDeleteProject}
              disabled={isSaving}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Project
            </Button>
          </div>
        </Card>
      </div>
    )
  }
)
