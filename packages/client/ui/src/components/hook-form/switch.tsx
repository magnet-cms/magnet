import { useFormContext } from 'react-hook-form'

import { ReactElement } from 'react'
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
} from '../ui/form'
import { Switch } from '../ui/switch'

type Props = {
	name: string
	label: string
	description?: ReactElement | string
}

export const RHFSwitch = ({ name, label, description }: Props) => {
	const { control } = useFormContext()

	return (
		<FormField
			name={name}
			control={control}
			render={({ field }) => (
				<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
					<div className="space-y-0.5">
						<FormLabel>{label}</FormLabel>
						<FormDescription>{description}</FormDescription>
					</div>
					<FormControl>
						<Switch checked={field.value} onCheckedChange={field.onChange} />
					</FormControl>
				</FormItem>
			)}
		/>
	)
}
