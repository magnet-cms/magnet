import { useFormContext } from 'react-hook-form'

import { ReactElement } from 'react'
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../ui/form'
import { Input } from '../ui/input'

type Props = {
	name: string
	label: string
	placeholder?: string
	description?: ReactElement | string
	type?: string
	disabled?: boolean
	required?: boolean
}

export const RHFText = ({
	name,
	label,
	placeholder,
	description,
	type,
	disabled,
	required,
}: Props) => {
	const { control } = useFormContext()

	return (
		<FormField
			name={name}
			control={control}
			render={({ field }) => (
				<FormItem className="gap-1">
					<FormLabel>{label}</FormLabel>
					<FormControl>
						<Input
							type={type}
							placeholder={placeholder}
							disabled={disabled}
							required={required}
							{...field}
						/>
					</FormControl>
					<FormDescription>{description}</FormDescription>
					<FormMessage />
				</FormItem>
			)}
		/>
	)
}
