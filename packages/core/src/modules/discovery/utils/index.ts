import { UITypes } from '@magnet-cms/common'

const defaultUIMapping: Record<string, UITypes> = {
	String: 'text',
	Number: 'number',
	Boolean: 'checkbox',
	Date: 'date',
}

export const getDefaultUIForType = (designType: string): { type: UITypes } => ({
	type: defaultUIMapping[designType] || 'text',
})
