'use client'

import { type ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'

import { Checkbox } from '@/components/ui/checkbox'
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'

type Props = {
	name: string
	label: ReactNode
	description?: ReactNode
	disabled?: boolean
	formItemClassName?: string
	checkboxProps?: React.ComponentProps<typeof Checkbox>
}

export const RHFCheckbox = ({
	name,
	label,
	description,
	disabled,
	formItemClassName,
	checkboxProps,
}: Props) => {
	const { control } = useFormContext()

	return (
		<FormField
			name={name}
			control={control}
			render={({ field }) => (
				<FormItem
					className={
						formItemClassName ??
						'flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow'
					}
				>
					<FormControl>
						<Checkbox
							checked={Boolean(field.value)}
							onCheckedChange={(checked) => field.onChange(Boolean(checked))}
							disabled={disabled}
							{...checkboxProps}
						/>
					</FormControl>
					<div className="space-y-1 leading-none">
						<FormLabel>{label}</FormLabel>
						<FormDescription>{description}</FormDescription>
					</div>
					<FormMessage />
				</FormItem>
			)}
		/>
	)
}
