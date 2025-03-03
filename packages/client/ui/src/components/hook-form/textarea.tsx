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
import { Textarea } from '../ui/textarea'

type Props = {
	name: string
	label: string
	placeholder?: string
	description?: ReactElement | string
	disabled?: boolean
}

export const RHFTextarea = ({
	name,
	label,
	placeholder,
	description,
	disabled,
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
						<Textarea
							placeholder={placeholder}
							disabled={disabled}
							className="resize-none"
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
