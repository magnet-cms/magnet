import {
	SchemaProperty,
	UICombobox,
	UIMultiSelect,
	UISelect,
	UITable,
	UITypes,
} from '@magnet-cms/common'
import {
	RHFCheckbox,
	RHFCombobox,
	RHFDatePicker,
	RHFFileUpload,
	RHFMultiSelect,
	RHFPhone,
	RHFQuantity,
	RHFRadioGroup,
	RHFRichText,
	RHFSelect,
	RHFSwitch,
	RHFTable,
	RHFText,
	RHFTextarea,
} from '@magnet-cms/ui/components'
import { capitalize } from '@magnet-cms/utils'
import { ReactElement } from 'react'

export const fieldRenderer: Record<
	UITypes,
	(prop: SchemaProperty) => ReactElement
> = {
	array: (_prop) => <div>array</div>,
	blocks: (_prop) => <div>blocks</div>,
	checkbox: (prop) => (
		<RHFCheckbox
			key={prop.name}
			name={prop.name}
			label={capitalize(prop.ui?.label || prop.name)}
			description={prop.ui?.description}
		/>
	),
	code: (_prop) => <div>code</div>,
	combobox: (prop) => (
		<RHFCombobox
			key={prop.name}
			name={prop.name}
			label={capitalize(prop.ui?.label || prop.name)}
			description={prop.ui?.description}
			options={(prop.ui as UICombobox).options.map((option) => ({
				value: option.value,
				label: option.key,
			}))}
		/>
	),
	date: (prop) => (
		<RHFDatePicker
			key={prop.name}
			name={prop.name}
			label={capitalize(prop.ui?.label || prop.name)}
			description={prop.ui?.description}
		/>
	),
	email: (prop) => (
		<RHFText
			key={prop.name}
			name={prop.name}
			type="email"
			label={capitalize(prop.ui?.label || prop.name)}
			description={prop.ui?.description}
		/>
	),
	fileUpload: (prop) => (
		<RHFFileUpload
			key={prop.name}
			name={prop.name}
			label={capitalize(prop.ui?.label || prop.name)}
			description={prop.ui?.description}
		/>
	),
	group: (_prop) => <div>group</div>,
	json: (_prop) => <div>json</div>,
	multiSelect: (prop) => (
		<RHFMultiSelect
			key={prop.name}
			name={prop.name}
			label={capitalize(prop.ui?.label || prop.name)}
			description={prop.ui?.description}
			options={(prop.ui as UIMultiSelect).options.map((option) => ({
				value: option.value,
				label: option.key,
			}))}
		/>
	),
	number: (prop) => (
		<RHFText
			key={prop.name}
			name={prop.name}
			type="number"
			label={capitalize(prop.ui?.label || prop.name)}
			description={prop.ui?.description}
		/>
	),
	phone: (prop) => (
		<RHFPhone
			key={prop.name}
			name={prop.name}
			label={capitalize(prop.ui?.label || prop.name)}
			description={prop.ui?.description}
		/>
	),
	point: (_prop) => <div>point</div>,
	quantity: (prop) => (
		<RHFQuantity
			key={prop.name}
			name={prop.name}
			label={capitalize(prop.ui?.label || prop.name)}
			description={prop.ui?.description}
		/>
	),
	radio: (prop) => (
		<RHFRadioGroup
			key={prop.name}
			name={prop.name}
			label={capitalize(prop.ui?.label || prop.name)}
			description={prop.ui?.description}
			options={(prop.ui as UISelect).options.map((option) => ({
				value: option.value,
				label: option.key,
			}))}
		/>
	),
	relationship: (_prop) => <div>relationship</div>,
	richText: (prop) => (
		<RHFRichText
			key={prop.name}
			name={prop.name}
			label={capitalize(prop.ui?.label || prop.name)}
			description={prop.ui?.description}
		/>
	),
	text: (prop) => (
		<RHFText
			key={prop.name}
			name={prop.name}
			label={capitalize(prop.ui?.label || prop.name)}
			description={prop.ui?.description}
		/>
	),
	textarea: (prop) => (
		<RHFTextarea
			key={prop.name}
			name={prop.name}
			label={capitalize(prop.ui?.label || prop.name)}
			description={prop.ui?.description}
		/>
	),
	select: (prop) => {
		const ui = prop.ui as UISelect
		if (ui.multi) {
			return (
				<RHFMultiSelect
					key={prop.name}
					name={prop.name}
					label={capitalize(ui.label || prop.name)}
					description={ui.description}
					options={ui.options.map((option) => ({
						value: option.value,
						label: option.key,
					}))}
				/>
			)
		}
		return (
			<RHFSelect
				key={prop.name}
				name={prop.name}
				label={capitalize(ui.label || prop.name)}
				description={ui.description}
				options={ui.options.map((option) => ({
					value: option.value,
					label: option.key,
				}))}
			/>
		)
	},
	switch: (prop) => (
		<RHFSwitch
			key={prop.name}
			name={prop.name}
			label={capitalize(prop.ui?.label || prop.name)}
			description={prop.ui?.description}
		/>
	),
	table: (prop) => {
		const ui = prop.ui as UITable
		return (
			<RHFTable
				key={prop.name}
				name={prop.name}
				label={capitalize(ui?.label || prop.name)}
				description={ui?.description}
				columns={ui?.columns || []}
				addButtonLabel="Add Environment"
				editDialogTitle="Edit Environment"
				addDialogTitle="Add Environment"
				dialogDescription="Configure a database environment for your application."
			/>
		)
	},
	upload: (_prop) => <div>upload</div>,
}
