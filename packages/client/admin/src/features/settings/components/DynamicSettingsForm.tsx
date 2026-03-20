'use client'

import type { SettingValue } from '@magnet-cms/common'
import { Card, CardContent, Skeleton } from '@magnet-cms/ui'
import { forwardRef, useImperativeHandle, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { useSetting } from '~/hooks/useDiscovery'
import { useSettingData, useSettingMutation } from '~/hooks/useSetting'
import { useAppIntl } from '~/i18n'
import type { ParsedSettingsSchema } from '../types'
import { parseSettingsSchema } from '../utils/parseSchema'
import { SettingsSectionCard } from './SettingsSectionCard'

export interface DynamicSettingsFormRef {
	/** Reset form to server values */
	reset: () => void
	/** Save form values to server */
	save: () => Promise<void>
	/** Whether the form has unsaved changes */
	isDirty: boolean
}

interface DynamicSettingsFormProps {
	/** Settings group to load and edit */
	group: string
}

type SettingsFormValues = Record<string, SettingValue>

/**
 * Dynamic settings form that loads schema metadata and values,
 * then renders form sections based on the schema.
 */
export const DynamicSettingsForm = forwardRef<
	DynamicSettingsFormRef,
	DynamicSettingsFormProps
>(function DynamicSettingsForm({ group }, ref) {
	const intl = useAppIntl()
	// Fetch schema metadata
	const { data: schemaData, isLoading: schemaLoading } = useSetting(group)

	// Fetch actual settings values
	const {
		data: settingsData,
		isLoading: valuesLoading,
		refetch,
	} = useSettingData<SettingsFormValues>(group)

	// Mutation hook
	const { mutate: updateSettings, isPending: isSaving } =
		useSettingMutation<SettingsFormValues>(group)

	// Parse schema when loaded
	const parsedSchema: ParsedSettingsSchema | null = useMemo(() => {
		if (schemaData && !('error' in schemaData)) {
			return parseSettingsSchema(schemaData)
		}
		return null
	}, [schemaData])

	// Build default values from schema
	const defaultValues = useMemo(() => {
		if (!parsedSchema) return {}

		const defaults: SettingsFormValues = {}
		for (const section of parsedSchema.sections) {
			for (const field of section.fields) {
				// Use default from UI metadata if available
				if (field.ui && typeof field.ui === 'object' && 'default' in field.ui) {
					defaults[field.name] = field.ui.default as SettingValue
				}
			}
		}
		return defaults
	}, [parsedSchema])

	// Merge schema defaults with API data for form values
	const formValues = useMemo(() => {
		if (settingsData && Object.keys(settingsData).length > 0) {
			return { ...defaultValues, ...settingsData }
		}
		if (Object.keys(defaultValues).length > 0) {
			return defaultValues
		}
		return undefined
	}, [defaultValues, settingsData])

	// Form setup — use `values` for reactive sync (no useEffect/reset needed)
	const methods = useForm<SettingsFormValues>({
		defaultValues,
		values: formValues,
		resetOptions: { keepDirtyValues: true },
	})

	const {
		reset,
		handleSubmit,
		formState: { isDirty },
	} = methods

	// Derive allowed field keys from parsed schema for safe payload filtering
	const schemaFieldKeys = useMemo(() => {
		if (!parsedSchema) return null
		const keys = new Set<string>()
		for (const section of parsedSchema.sections) {
			for (const field of section.fields) {
				keys.add(field.name)
			}
		}
		return keys
	}, [parsedSchema])

	// Handle save — only send keys that belong to this settings schema
	const handleSave = async (data: SettingsFormValues): Promise<void> => {
		const payload = schemaFieldKeys
			? Object.fromEntries(
					Object.entries(data).filter(([k]) => schemaFieldKeys.has(k)),
				)
			: data
		return new Promise((resolve, reject) => {
			updateSettings(payload, {
				onSuccess: () => {
					toast.success(
						intl.formatMessage({
							id: 'settings.savedSuccess',
							defaultMessage: 'Settings saved successfully',
						}),
					)
					refetch()
					resolve()
				},
				onError: (err) => {
					toast.error(
						err.message ||
							intl.formatMessage({
								id: 'settings.saveError',
								defaultMessage: 'Failed to save settings',
							}),
					)
					reject(err)
				},
			})
		})
	}

	// Handle reset
	const handleReset = () => {
		reset(formValues ?? defaultValues)
	}

	// Expose ref methods
	useImperativeHandle(ref, () => ({
		reset: handleReset,
		save: () => handleSave(methods.getValues()),
		isDirty,
	}))

	// Loading state
	if (schemaLoading || valuesLoading) {
		return (
			<div className="space-y-8">
				<Card className="overflow-hidden">
					<div className="px-6 py-4 border-b border-gray-100">
						<Skeleton className="h-5 w-32" />
					</div>
					<CardContent className="px-6 pb-6 pt-6 space-y-6">
						<Skeleton className="h-10 w-full" />
						<div className="grid grid-cols-2 gap-6">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
						<Skeleton className="h-10 w-full" />
					</CardContent>
				</Card>
			</div>
		)
	}

	// Error or no schema
	if (!parsedSchema) {
		return (
			<div className="text-center py-8 text-gray-500">
				{intl.formatMessage(
					{
						id: 'settings.loadError',
						defaultMessage: 'Failed to load settings schema for "{group}"',
					},
					{ group },
				)}
			</div>
		)
	}

	// No sections (empty schema)
	if (parsedSchema.sections.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				{intl.formatMessage({
					id: 'settings.noAvailable',
					defaultMessage: 'No settings available for this group',
				})}
			</div>
		)
	}

	return (
		<FormProvider {...methods}>
			<form onSubmit={handleSubmit(handleSave)} className="space-y-8">
				{parsedSchema.sections.map((section) => (
					<SettingsSectionCard
						key={section.name}
						section={section}
						disabled={isSaving}
					/>
				))}
			</form>
		</FormProvider>
	)
})
