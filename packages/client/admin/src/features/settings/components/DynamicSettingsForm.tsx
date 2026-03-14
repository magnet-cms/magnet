'use client'

import type { SettingValue } from '@magnet-cms/common'
import { Card, CardContent, Skeleton } from '@magnet-cms/ui'
import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { useSetting } from '~/hooks/useDiscovery'
import { useSettingData, useSettingMutation } from '~/hooks/useSetting'
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

	// Form setup
	const methods = useForm<SettingsFormValues>({
		defaultValues,
	})

	const {
		reset,
		handleSubmit,
		formState: { isDirty },
	} = methods

	// Reset form immediately when group changes to avoid stale values
	useEffect(() => {
		reset(defaultValues)
	}, [group, reset]) // eslint-disable-line react-hooks/exhaustive-deps

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

	// Map Setting[] array (each item is { key, value, group, type, ... }) to { [key]: value }
	const mergeSettingsData = (data: SettingsFormValues[]): SettingsFormValues =>
		data.reduce<SettingsFormValues>((acc, item) => {
			const setting = item as unknown as { key: string; value: SettingValue }
			if (typeof setting.key === 'string') {
				return { ...acc, [setting.key]: setting.value }
			}
			return acc
		}, {})

	// Sync form with loaded data
	useEffect(() => {
		if (settingsData && settingsData.length > 0) {
			const merged = mergeSettingsData(settingsData)
			reset({ ...defaultValues, ...merged })
		}
	}, [settingsData, reset, defaultValues])

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
					toast.success('Settings saved successfully')
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

	// Handle reset
	const handleReset = () => {
		if (settingsData && settingsData.length > 0) {
			const merged = mergeSettingsData(settingsData)
			reset({ ...defaultValues, ...merged })
		} else {
			reset(defaultValues)
		}
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
				<Card className="border border-gray-200 overflow-hidden">
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
				Failed to load settings schema for &quot;{group}&quot;
			</div>
		)
	}

	// No sections (empty schema)
	if (parsedSchema.sections.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				No settings available for this group
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
