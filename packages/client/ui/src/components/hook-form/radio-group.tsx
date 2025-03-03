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
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'

type Option = { label: string; value: string }

type Props = {
	name: string
	label: string
	options: Option[]
	description?: ReactElement | string
}

export const RHFRadioGroup = ({ name, label, options, description }: Props) => {
	const { control } = useFormContext()

	return (
		<FormField
			name={name}
			control={control}
			render={({ field }) => (
				<FormItem className="space-y-3">
					<FormLabel>{label}</FormLabel>
					<FormControl>
						<RadioGroup
							onValueChange={field.onChange}
							defaultValue={field.value}
							className="flex flex-col space-y-1"
						>
							{options.map(({ label, value }) => (
								<FormItem
									key={value}
									className="flex items-center space-x-3 space-y-0"
								>
									<FormControl>
										<RadioGroupItem value={value} />
									</FormControl>
									<FormLabel className="font-normal">{label}</FormLabel>
								</FormItem>
							))}
						</RadioGroup>
					</FormControl>
					{description && <FormDescription>{description}</FormDescription>}
					<FormMessage />
				</FormItem>
			)}
		/>
	)
}
