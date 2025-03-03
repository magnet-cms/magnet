import { useFormContext } from 'react-hook-form'

import { ReactElement } from 'react'
import { Checkbox } from '../ui/checkbox'
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
} from '../ui/form'

type Props = {
	name: string
	label: string
	description?: ReactElement | string
	disabled?: boolean
}

export const RHFCheckbox = ({ name, label, description, disabled }: Props) => {
	const { control } = useFormContext()

	return (
		<FormField
			name={name}
			control={control}
			render={({ field }) => (
				<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
					<FormControl>
						<Checkbox
							checked={field.value}
							onCheckedChange={field.onChange}
							disabled={disabled}
						/>
					</FormControl>
					<div className="space-y-1 leading-none">
						<FormLabel>{label}</FormLabel>
						<FormDescription>{description}</FormDescription>
					</div>
				</FormItem>
			)}
		/>
	)
}
