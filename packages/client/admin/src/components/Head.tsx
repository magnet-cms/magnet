import {
	Button,
	Separator,
	ToggleGroup,
	ToggleGroupItem,
} from '@magnet/ui/components'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Action = {
	label: string
	to?: string
	onClick?: () => void
	icon?: ReactNode
	variant?:
		| 'default'
		| 'destructive'
		| 'outline'
		| 'secondary'
		| 'ghost'
		| 'link'
}

type GroupedActions = {
	grouped: boolean
	items: (Action & { default?: boolean })[]
}

type HeadProps = {
	title: string
	actions?: ReactNode | Action[] | GroupedActions
}

export const Head = ({ title, actions }: HeadProps) => {
	const isGroupedActions = (
		actions: ReactNode | Action[] | GroupedActions | undefined,
	): actions is GroupedActions => {
		return (
			actions !== undefined &&
			actions !== null &&
			typeof actions === 'object' &&
			!Array.isArray(actions) &&
			'grouped' in actions &&
			'items' in actions
		)
	}

	const renderActions = () => {
		if (Array.isArray(actions)) {
			return actions.map((action, index) => (
				<Button
					key={`action-${action.label}-${index}`}
					variant={action.variant}
					onClick={action.onClick}
				>
					{action.icon && <span className="mr-2">{action.icon}</span>}
					{action.label}
				</Button>
			))
		}

		if (isGroupedActions(actions)) {
			return (
				<ToggleGroup
					type="single"
					defaultValue={actions.items
						.find((item) => item.default)
						?.label.toLowerCase()
						.replace(/\s+/g, '-')}
				>
					{actions.items.map((action, index) => (
						<ToggleGroupItem
							key={`grouped-action-${action.label}-${index}`}
							value={action.label.toLowerCase().replace(/\s+/g, '-')}
							aria-label={action.label}
							onClick={action.onClick}
							asChild
						>
							<Link to={action.to ?? ''}>
								{action.icon && <span className="mr-2">{action.icon}</span>}
								{action.label}
							</Link>
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			)
		}

		return actions
	}

	return (
		<>
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
				<div className="flex items-center gap-2">{renderActions()}</div>
			</div>
			<Separator />
		</>
	)
}
