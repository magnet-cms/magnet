import { zodResolver } from '@hookform/resolvers/zod'
import { SchemaMetadata, SchemaProperty, UISide, UITab } from '@magnet/common'
import {
	FormProvider,
	RHFText,
	Separator,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@magnet/ui/components'
import { ReactElement, useEffect, useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'
import { fieldRenderer } from './Fields'
import { buildFormSchema } from './validations'

type FormBuilderProps<T> = {
	schema: SchemaMetadata
	onSubmit: (data: T) => void
	initialValues?: Partial<T>
}

export const FormBuilder = <T extends Record<string, unknown>>({
	schema,
	onSubmit,
	initialValues,
}: FormBuilderProps<T>) => {
	const formSchema = buildFormSchema(schema)
	type FormValues = z.infer<typeof formSchema>

	const methods = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: initialValues as FormValues | undefined,
	})

	useEffect(() => {
		methods.reset(initialValues as FormValues | undefined)
	}, [initialValues])

	const fieldsWithoutTabs: SchemaProperty[] = []
	const groupedProperties: Record<string, SchemaProperty[]> = {}
	const sidePanelFields: SchemaProperty[] = []

	// Only process properties that have UI defined (skip hidden fields like password)
	schema.properties
		.filter((prop) => prop.ui !== undefined && prop.ui !== null)
		.forEach((prop) => {
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
				className={`grid gap-4 ${row.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}
			>
				{row.map(renderField)}
			</div>
		))
	}

	const submitHandler: SubmitHandler<FormValues> = (data) => {
		onSubmit(data as T)
	}

	return (
		<FormProvider onSubmit={submitHandler} {...methods}>
			<div className="grid grid-cols-1 md:grid-cols-[auto_320px] gap-6">
				<div>
					{fieldsWithoutTabs.length > 0 && (
						<div className="flex flex-col gap-4 mb-6">
							{renderMainRows(fieldsWithoutTabs)}
						</div>
					)}

					{tabs.length === 1 ? (
						<div>
							<div className="flex flex-row items-center overflow-hidden gap-4 mb-6">
								<h2 className="text-xl font-semibold">{tabs[0]}</h2>
								<Separator />
							</div>
							<div className="flex flex-col gap-4">
								{tabs[0] && renderMainRows(groupedProperties[tabs[0]] || [])}
							</div>
						</div>
					) : (
						tabs.length > 1 && (
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
										<div className="flex flex-col gap-4 pt-4">
											{renderMainRows(groupedProperties[tab] || [])}
										</div>
									</TabsContent>
								))}
							</Tabs>
						)
					)}
				</div>

				{sidePanelFields.length > 0 && (
					<div className="border-l border-gray-200 pl-6">
						<div className="flex flex-col gap-4">
							{sidePanelFields.map((prop) => (
								<div key={prop.name}>{renderField(prop)}</div>
							))}
						</div>
					</div>
				)}
			</div>
		</FormProvider>
	)
}
