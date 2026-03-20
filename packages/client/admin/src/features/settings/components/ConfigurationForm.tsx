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

/** API returns an array of partial setting records merged into one object */
type GeneralSettingsRecords = Partial<GeneralSettings>[]

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
		const {
			data: settingsData,
			isLoading,
			error,
			refetch,
		} = useSettingData<GeneralSettingsRecords>('general')
		const { mutate: updateSettings, isPending: isSaving } =
			useSettingMutation<GeneralSettings>('general')

		// Local form state
		const [formState, setFormState] = useState<GeneralSettings>(defaultSettings)
		const [hasChanges, setHasChanges] = useState(false)

		// Sync form state with loaded settings
		useEffect(() => {
			if (settingsData && settingsData.length > 0) {
				// Merge all settings into a single object
				const mergedSettings = settingsData.reduce<GeneralSettings>(
					(acc, item) => ({ ...acc, ...item }),
					{} as GeneralSettings,
				)
				setFormState({
					...defaultSettings,
					...mergedSettings,
				})
				setHasChanges(false)
			}
		}, [settingsData])

		// Update form field
		const updateField = <K extends keyof GeneralSettings>(
			key: K,
			value: GeneralSettings[K],
		) => {
			setFormState((prev) => ({ ...prev, [key]: value }))
			setHasChanges(true)
		}

		const handleReset = () => {
			if (settingsData && settingsData.length > 0) {
				const mergedSettings = settingsData.reduce<GeneralSettings>(
					(acc, item) => ({ ...acc, ...item }),
					{} as GeneralSettings,
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
			if (
				window.confirm(
					'Are you sure you want to delete this project? This cannot be undone.',
				)
			) {
				toast.info('Project deletion is not available yet')
			}
		}

		// Loading state
		if (isLoading) {
			return (
				<div className="space-y-8">
					<Card className="overflow-hidden">
						<div className="border-b border-border px-6 py-4">
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
				<Card className="overflow-hidden">
					<div className="flex items-center gap-2 border-b border-border px-6 py-4">
						<Box className="size-[18px] text-muted-foreground" />
						<h2 className="text-sm font-semibold text-foreground">
							Project Identity
						</h2>
						{hasChanges && (
							<span className="ml-auto text-xs text-amber-600 font-medium">
								Unsaved changes
							</span>
						)}
					</div>
					<CardContent className="px-6 pb-6 space-y-6">
						{/* Logo Upload */}
						<div className="flex items-center gap-6">
							<button
								type="button"
								className="relative group cursor-pointer rounded-full"
							>
								<div className="flex size-16 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/50 text-muted-foreground transition-colors group-hover:border-border">
									<Box className="size-8 text-muted-foreground/50" />
								</div>
								<div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/50 opacity-0 transition-opacity group-hover:opacity-100">
									<span className="text-xs font-medium text-primary-foreground">
										Upload
									</span>
								</div>
							</button>
							<div>
								<h3 className="text-sm font-medium text-foreground">
									Project Icon
								</h3>
								<p className="mt-1 text-xs text-muted-foreground">
									This icon will be displayed on your dashboard.
								</p>
								<button
									type="button"
									className="mt-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
								>
									Upload New
								</button>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
							<div className="col-span-1 space-y-1.5">
								<Label
									htmlFor="project-name"
									className="text-xs font-medium text-foreground"
								>
									Display Name
								</Label>
								<Input
									id="project-name"
									type="text"
									value={formState.displayName || ''}
									onChange={(e) => updateField('displayName', e.target.value)}
									className="rounded-lg border-input bg-muted/40"
								/>
							</div>
							<div className="col-span-1 space-y-1.5">
								<Label
									htmlFor="env"
									className="text-xs font-medium text-foreground"
								>
									Environment
								</Label>
								<Select
									value={formState.environment || 'development'}
									onValueChange={(value) => updateField('environment', value)}
								>
									<SelectTrigger
										id="env"
										className="h-[42px] w-full rounded-lg border-input bg-muted/40"
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
								<Label
									htmlFor="url"
									className="text-xs font-medium text-foreground"
								>
									Public URL
								</Label>
								<div className="flex overflow-hidden rounded-lg border border-border shadow-sm">
									<span className="inline-flex items-center border-r border-border bg-muted/50 px-3 text-sm text-muted-foreground">
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
								<p className="text-[11px] text-muted-foreground">
									The primary URL used for API responses and callbacks.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Section: Preferences */}
				<Card className="overflow-hidden">
					<div className="flex items-center gap-2 border-b border-border px-6 py-4">
						<SlidersHorizontal className="size-[18px] text-muted-foreground" />
						<h2 className="text-sm font-semibold text-foreground">
							Preferences
						</h2>
					</div>
					<div className="px-6 pb-6 space-y-5">
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-sm font-medium text-foreground">
									Maintenance Mode
								</p>
								<p className="mt-0.5 text-xs text-muted-foreground">
									Disable public access to the API.
								</p>
							</div>
							<Switch
								checked={formState.maintenanceMode || false}
								onCheckedChange={(checked) =>
									updateField('maintenanceMode', checked)
								}
							/>
						</div>
						<hr className="border-border" />
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-sm font-medium text-foreground">
									Public Logs
								</p>
								<p className="mt-0.5 text-xs text-muted-foreground">
									Allow unauthenticated users to view system status.
								</p>
							</div>
							<Switch
								checked={formState.publicLogs || false}
								onCheckedChange={(checked) =>
									updateField('publicLogs', checked)
								}
							/>
						</div>
						<hr className="border-border" />
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-sm font-medium text-foreground">
									Automatic Updates
								</p>
								<p className="mt-0.5 text-xs text-muted-foreground">
									Install security patches automatically.
								</p>
							</div>
							<Switch
								checked={formState.autoUpdates || false}
								onCheckedChange={(checked) =>
									updateField('autoUpdates', checked)
								}
							/>
						</div>
					</div>
				</Card>

				{/* Section: Danger Zone */}
				<Card className="overflow-hidden border border-destructive/30 bg-destructive/5">
					<div className="flex items-center gap-2 border-b border-destructive/20 px-6 py-4">
						<span className="font-bold text-destructive">!</span>
						<h2 className="text-sm font-semibold text-destructive">
							Danger Zone
						</h2>
					</div>
					<div className="flex flex-col justify-between gap-4 px-6 pb-6 sm:flex-row sm:items-center">
						<div>
							<p className="text-sm font-medium text-foreground">
								Delete Project
							</p>
							<p className="mt-1 max-w-sm text-xs text-muted-foreground">
								Once you delete a project, there is no going back. Please be
								certain.
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="w-full border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/10 sm:w-auto"
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
	},
)
