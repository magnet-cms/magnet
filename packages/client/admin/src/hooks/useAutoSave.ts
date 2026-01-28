import { useCallback, useEffect, useRef, useState } from 'react'
import type { UseFormTrigger } from 'react-hook-form'
import { useAdapter } from '~/core/provider/MagnetProvider'

interface UseAutoSaveOptions {
	documentId: string
	schema: string
	locale?: string
	debounceMs?: number
	enabled?: boolean
	trigger?: UseFormTrigger<Record<string, unknown>>
	onSuccess?: () => void
}

interface UseAutoSaveReturn {
	save: (data: Record<string, unknown>) => void
	isSaving: boolean
	lastSaved: Date | null
	error: Error | null
	reset: () => void
}

/**
 * Hook for auto-saving form data with debounce
 * Validates before saving, silently skips if validation fails
 */
export function useAutoSave({
	documentId,
	schema,
	locale,
	debounceMs = 800,
	enabled = true,
	trigger,
	onSuccess,
}: UseAutoSaveOptions): UseAutoSaveReturn {
	const adapter = useAdapter()
	const [isSaving, setIsSaving] = useState(false)
	const [lastSaved, setLastSaved] = useState<Date | null>(null)
	const [error, setError] = useState<Error | null>(null)

	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const latestDataRef = useRef<Record<string, unknown> | null>(null)
	const isMountedRef = useRef(true)

	// Track if component is mounted
	useEffect(() => {
		isMountedRef.current = true
		return () => {
			isMountedRef.current = false
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	const performSave = useCallback(
		async (data: Record<string, unknown>) => {
			if (!isMountedRef.current) return

			// Run validation if trigger is provided
			if (trigger) {
				const isValid = await trigger()
				if (!isValid) {
					// Silent skip - validation errors shown inline
					return
				}
			}

			setIsSaving(true)
			setError(null)

			try {
				await adapter.content.update(schema, documentId, data, {
					locale,
					status: 'draft',
				})

				if (isMountedRef.current) {
					setLastSaved(new Date())
					onSuccess?.()
				}
			} catch (err) {
				if (isMountedRef.current) {
					setError(err instanceof Error ? err : new Error('Failed to save'))
				}
			} finally {
				if (isMountedRef.current) {
					setIsSaving(false)
				}
			}
		},
		[adapter, schema, documentId, locale, trigger, onSuccess],
	)

	const save = useCallback(
		(data: Record<string, unknown>) => {
			if (!enabled) return

			latestDataRef.current = data

			// Clear existing timeout
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}

			// Set new debounced save
			timeoutRef.current = setTimeout(() => {
				if (latestDataRef.current) {
					performSave(latestDataRef.current)
				}
			}, debounceMs)
		},
		[enabled, debounceMs, performSave],
	)

	const reset = useCallback(() => {
		setLastSaved(null)
		setError(null)
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
		}
	}, [])

	return {
		save,
		isSaving,
		lastSaved,
		error,
		reset,
	}
}
