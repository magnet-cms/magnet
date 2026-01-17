'use client'

import { type ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'

import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib'

type Option = { value: string; label: ReactNode }

type RHFSelectProps = {
	name: string
	label: string
	options: Option[]
	description?: ReactNode
	placeholder?: string
	disabled?: boolean
	required?: boolean
	formItemClassName?: string
	triggerClassName?: string
	onValueChange?: (value: string) => void
}

export const RHFSelect = ({
	name,
	label,
	options,
	description,
	placeholder = 'Select an option',
	disabled,
	required,
	formItemClassName,
	triggerClassName,
	onValueChange,
}: RHFSelectProps) => {
	const { control } = useFormContext()

	return (
		<FormField
			name={name}
			control={control}
			render={({ field }) => (
				<FormItem className={cn('flex flex-col gap-2', formItemClassName)}>
					<FormLabel className="h-3.5">{label}</FormLabel>
					<FormControl>
						<Select
							value={field.value ?? undefined}
							onValueChange={(value) => {
								field.onChange(value)
								onValueChange?.(value)
							}}
							disabled={disabled}
						>
							<SelectTrigger
								className={triggerClassName ?? 'w-full'}
								aria-required={required}
								data-required={required ? 'true' : undefined}
							>
								<SelectValue placeholder={placeholder} />
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
