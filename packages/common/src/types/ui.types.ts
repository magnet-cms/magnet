export type UIPresentationFields = 'tab' | 'collapsible' | 'row' | 'customUI'

export type UITypes =
	| 'array'
	| 'blocks'
	| 'checkbox'
	| 'code'
	| 'combobox'
	| 'date'
	| 'email'
	| 'fileUpload'
	| 'group'
	| 'json'
	| 'multiSelect'
	| 'number'
	| 'phone'
	| 'point'
	| 'quantity'
	| 'radio'
	| 'relationship'
	| 'richText'
	| 'select'
	| 'switch'
	| 'table'
	| 'text'
	| 'textarea'
	| 'upload'

export type UIBase = {
	label?: string
	description?: string
	placeholder?: string
	type?: UITypes
	row?: boolean
	collapsible?: boolean
}

export type UISelectItem = {
	key: string
	value: string
}

export type UITab = UIBase & {
	tab: string
	side?: never
	options?: UISelectItem[]
}

export type UISide = UIBase & {
	side: true
	tab?: never
	options?: UISelectItem[]
}

export type UISelect = UIBase & {
	type: 'select'
	multi?: boolean
	options: UISelectItem[]
}

export type UIMultiSelect = UIBase & {
	type: 'multiSelect'
	options: UISelectItem[]
}

export type UICombobox = UIBase & {
	type: 'combobox'
	options: UISelectItem[]
}

export type UITableColumn = {
	key: string
	header: string
	type?: 'text' | 'badge' | 'status' | 'input' | 'code'
}

export type UITable = UIBase & {
	type: 'table'
	columns?: UITableColumn[]
}

export type UIDecoratorOptions =
	| UITab
	| UISide
	| UISelect
	| UIMultiSelect
	| UICombobox
	| UITable
