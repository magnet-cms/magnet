import { ReactElement } from 'react'
import { useFormContext } from 'react-hook-form'
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../ui/form'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select'

type RHFSelectProps = {
	name: string
	label: string
	options: { value: string; label: string }[]
	description?: ReactElement | string
	disabled?: boolean
}

export const RHFSelect = ({
	name,
	label,
	options,
	description,
	disabled,
}: RHFSelectProps) => {
	const { control } = useFormContext()

	return (
		<FormField
			name={name}
			control={control}
			render={({ field }) => (
				<FormItem className="gap-1">
					<FormLabel>{label}</FormLabel>
					<FormControl>
						<Select
							onValueChange={field.onChange}
							defaultValue={field.value}
							disabled={disabled}
							{...field}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select an option" />
							</SelectTrigger>
							<SelectContent>
								{options.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FormControl>
					<FormDescription>{description}</FormDescription>
					<FormMessage />
				</FormItem>
			)}
		/>
	)
}
