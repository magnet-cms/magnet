import { zodResolver } from '@hookform/resolvers/zod'
import {
	SchemaMetadata,
	SchemaProperty,
	UISide,
	UITab,
} from '@magnet-cms/common'
import {
	FormProvider,
	RHFText,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@magnet-cms/ui/components'
import { format } from 'date-fns'
import { ReactElement, useEffect, useMemo, useRef, useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'
import { fieldRenderer } from './Fields'
import { buildFormSchema } from './validations'

type FormBuilderProps<T> = {
	schema: SchemaMetadata
	onSubmit?: (data: T) => void
	onChange?: (data: T) => void
	initialValues?: Partial<T>
	metadata?: {
		createdAt?: Date | string
		updatedAt?: Date | string
		publishedAt?: Date | string
	}
}

/**
 * Normalize initial values to convert ObjectId references to strings for form fields
 * This ensures relationship fields work correctly with RHFSelect/RHFMultiSelect
 */
const normalizeInitialValues = (
	values: Record<string, unknown> | undefined,
	schema: SchemaMetadata,
): Record<string, unknown> | undefined => {
	if (!values) return values

	const normalized = { ...values }

	schema.properties
		.filter(
			(prop) => prop.ui?.type === 'relationship' || prop.ui?.type === 'upload',
		)
		.forEach((prop) => {
			const value = normalized[prop.name]

			if (value === null || value === undefined) {
				// Set default for arrays
				if (prop.isArray) {
					normalized[prop.name] = []
				}
				return
			}

			// Handle array relationships (e.g., veterinarians)
			if (prop.isArray && Array.isArray(value)) {
				normalized[prop.name] = value
					.filter((item) => item !== null && item !== undefined) // Filter out null/undefined
					.map((item) => {
						// If item is a populated object with an id, use the id
						if (item && typeof item === 'object' && 'id' in item) {
							return typeof item.id === 'string' ? item.id : String(item.id)
						}
						// If item is an ObjectId object (has toString), convert to string
						if (item && typeof item === 'object' && 'toString' in item) {
							return item.toString()
						}
						// If item is already a string, return as is
						return typeof item === 'string' ? item : String(item)
					})
			} else if (!prop.isArray) {
				// Handle single relationships (e.g., owner)
				// If value is a populated object with an id, use the id
				if (value && typeof value === 'object' && 'id' in value) {
					normalized[prop.name] =
						typeof value.id === 'string' ? value.id : String(value.id)
				} else if (value && typeof value === 'object' && 'toString' in value) {
					// If value is an ObjectId object, convert to string
					normalized[prop.name] = value.toString()
				} else if (
					typeof value !== 'string' &&
					value !== null &&
					value !== undefined
				) {
					normalized[prop.name] = String(value)
				}
			}
		})

	return normalized
}

export const FormBuilder = <T extends Record<string, unknown>>({
	schema,
	onSubmit,
	onChange,
	initialValues,
	metadata,
}: FormBuilderProps<T>) => {
	const formSchema = buildFormSchema(schema)
	type FormValues = z.infer<typeof formSchema>

	// Normalize initial values to convert ObjectId references to strings
	// Memoize to prevent unnecessary recalculations and re-renders
	// Use a stable key based on initialValues content and schema name
	const initialValuesKey = useMemo(
		() =>
			initialValues
				? `${schema.name}-${JSON.stringify(initialValues)}`
				: `${schema.name}-undefined`,
		[initialValues, schema.name],
	)
	const normalizedInitialValues = useMemo(
		() =>
			normalizeInitialValues(
				initialValues as Record<string, unknown> | undefined,
				schema,
			),
		[initialValuesKey, schema],
	)

	const methods = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: normalizedInitialValues as FormValues | undefined,
	})

	// Track if initial values have been set to avoid triggering onChange on mount
	const isInitializedRef = useRef(false)
	// Track previous normalized values to avoid unnecessary resets
	const previousNormalizedValuesRef = useRef<
		Record<string, unknown> | undefined
	>(normalizedInitialValues)

	useEffect(() => {
		// Only reset if values actually changed (compare by reference and content)
		const valuesChanged =
			previousNormalizedValuesRef.current !== normalizedInitialValues &&
			JSON.stringify(previousNormalizedValuesRef.current) !==
				JSON.stringify(normalizedInitialValues)

		if (valuesChanged) {
			previousNormalizedValuesRef.current = normalizedInitialValues
			methods.reset(normalizedInitialValues as FormValues | undefined)
			// Mark as initialized after reset (with delay to skip initial render)
			const timer = setTimeout(() => {
				isInitializedRef.current = true
			}, 100)
			return () => clearTimeout(timer)
		}

		// If values haven't changed but not initialized yet, mark as initialized
		if (!isInitializedRef.current) {
			const timer = setTimeout(() => {
				isInitializedRef.current = true
			}, 100)
			return () => clearTimeout(timer)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialValuesKey]) // Only depend on the key to prevent loops

	// Subscribe to form changes using watch callback (subscription pattern)
	// Use ref for onChange to avoid recreating subscription when onChange reference changes
	const onChangeRef = useRef(onChange)
	useEffect(() => {
		onChangeRef.current = onChange
	}, [onChange])

	useEffect(() => {
		if (!onChangeRef.current) return

		const subscription = methods.watch((data) => {
			if (isInitializedRef.current && onChangeRef.current) {
				onChangeRef.current(data as T)
			}
		})

		return () => subscription.unsubscribe()
	}, [methods]) // Only depend on methods, not onChange to prevent recreating subscription

	const fieldsWithoutTabs: SchemaProperty[] = []
	const groupedProperties: Record<string, SchemaProperty[]> = {}
	const sidePanelFields: SchemaProperty[] = []
	const relationshipFields: SchemaProperty[] = []

	// Only process properties that have UI defined (skip hidden fields like password)
	schema.properties
		.filter((prop) => prop.ui !== undefined && prop.ui !== null)
		.forEach((prop) => {
			// Separate relationship fields for right sidebar
			if (prop.ui?.type === 'relationship') {
				relationshipFields.push(prop)
				return
			}

			if ((prop.ui as UISide)?.side) {
				sidePanelFields.push(prop)
			} else {
				const tab = (prop.ui as UITab)?.tab
				if (!tab) {
					fieldsWithoutTabs.push(prop)
				} else {
					if (!groupedProperties[tab]) {
						groupedProperties[tab] = []
					}
					groupedProperties[tab].push(prop)
				}
			}
		})

	const tabs = Object.keys(groupedProperties)
	const [activeTab, setActiveTab] = useState<string>(
		tabs.length && tabs[0] ? tabs[0] : '',
	)

	const renderField = (prop: SchemaProperty): ReactElement => {
		const fieldType = prop.ui?.type || 'text'
		return fieldRenderer[fieldType] ? (
			fieldRenderer[fieldType](prop)
		) : (
			<RHFText key={prop.name} name={prop.name} label={prop.name} />
		)
	}

	const renderMainRows = (fields: SchemaProperty[]) => {
		const rowFields: SchemaProperty[][] = []
		let currentRow: SchemaProperty[] = []

		fields.forEach((prop) => {
			if (prop.ui?.row) {
				if (currentRow.length < 2) {
					currentRow.push(prop)
				} else {
					rowFields.push([...currentRow])
					currentRow = [prop]
				}
			} else {
				if (currentRow.length > 0) {
					rowFields.push([...currentRow])
					currentRow = []
				}
				rowFields.push([prop])
			}
		})

		if (currentRow.length > 0) {
			rowFields.push([...currentRow])
		}

		return rowFields.map((row) => (
			<div
				key={row.map((prop) => prop.name).join('-')}
				className={`grid gap-6 ${row.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}
			>
				{row.map(renderField)}
			</div>
		))
	}

	const submitHandler: SubmitHandler<FormValues> = (data) => {
		onSubmit?.(data as T)
	}

	const formatDate = (date: Date | string | undefined) => {
		if (!date) return 'Never'
		const d = typeof date === 'string' ? new Date(date) : date
		return format(d, 'MMM d, yyyy')
	}

	const hasSidebar =
		sidePanelFields.length > 0 || relationshipFields.length > 0 || metadata

	return (
		<FormProvider onSubmit={submitHandler} {...methods}>
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
				{/* Main Form Column */}
				<div className={hasSidebar ? 'lg:col-span-8' : 'lg:col-span-12'}>
					<div className="space-y-10">
						{/* Fields without tabs */}
						{fieldsWithoutTabs.length > 0 && (
							<div>
								<h3 className="text-base font-semibold mb-6">
									General Information
								</h3>
								<div className="space-y-4">
									{renderMainRows(fieldsWithoutTabs)}
								</div>
							</div>
						)}

						{/* Single tab - show as section */}
						{tabs.length === 1 && (
							<div
								className={
									fieldsWithoutTabs.length > 0
										? 'border-t border-border pt-8'
										: ''
								}
							>
								<h3 className="text-base font-semibold mb-6">{tabs[0]}</h3>
								<div className="space-y-4">
									{tabs[0] && renderMainRows(groupedProperties[tabs[0]] || [])}
								</div>
							</div>
						)}

						{/* Multiple tabs */}
						{tabs.length > 1 && (
							<div
								className={
									fieldsWithoutTabs.length > 0
										? 'border-t border-border pt-8'
										: ''
								}
							>
								<Tabs value={activeTab} onValueChange={setActiveTab}>
									<TabsList>
										{tabs.map((tab) => (
											<TabsTrigger key={tab} value={tab}>
												{tab}
											</TabsTrigger>
										))}
									</TabsList>
									{tabs.map((tab) => (
										<TabsContent key={tab} value={tab}>
											<div className="space-y-4 pt-6">
												{renderMainRows(groupedProperties[tab] || [])}
											</div>
										</TabsContent>
									))}
								</Tabs>
							</div>
						)}
					</div>
				</div>

				{/* Sidebar Column */}
				{hasSidebar && (
					<div className="lg:col-span-4 space-y-8 lg:border-l lg:border-border lg:pl-8">
						{/* Relationship fields */}
						{relationshipFields.length > 0 && (
							<div className="space-y-6">
								<h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
									Relations
								</h4>
								<div className="space-y-4">
									{relationshipFields.map((prop) => (
										<div key={prop.name}>{renderField(prop)}</div>
									))}
								</div>
							</div>
						)}

						{/* Side panel fields */}
						{sidePanelFields.length > 0 && (
							<div className="space-y-6">
								<h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
									Additional Info
								</h4>
								<div className="space-y-4">
									{sidePanelFields.map((prop) => (
										<div key={prop.name}>{renderField(prop)}</div>
									))}
								</div>
							</div>
						)}

						{/* Metadata section */}
						{metadata && (
							<div className="border-t border-border pt-6 space-y-4">
								<h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
									Metadata
								</h4>
								<div className="space-y-3">
									<div className="flex items-center justify-between text-sm">
										<span className="text-muted-foreground">Created</span>
										<span className="font-medium">
											{formatDate(metadata.createdAt)}
										</span>
									</div>
									{metadata.updatedAt && (
										<div className="flex items-center justify-between text-sm">
											<span className="text-muted-foreground">Updated</span>
											<span className="font-medium">
												{formatDate(metadata.updatedAt)}
											</span>
										</div>
									)}
									<div className="flex items-center justify-between text-sm">
										<span className="text-muted-foreground">
											Last Published
										</span>
										<span className="font-medium">
											{formatDate(metadata.publishedAt)}
										</span>
									</div>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</FormProvider>
	)
}
