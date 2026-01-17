'use client'

import { Check, ChevronsUpDown, X } from 'lucide-react'
import { type ReactNode } from 'react'
import { type ControllerRenderProps, useFormContext } from 'react-hook-form'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command'
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib'

type Option = { label: ReactNode; value: string }

type Props = {
	name: string
	label: string
	options: Option[]
	description?: ReactNode
	disabled?: boolean
	placeholder?: string
	searchPlaceholder?: string
	emptyState?: ReactNode
	formItemClassName?: string
	triggerClassName?: string
	badgeClassName?: string
	onChange?: (values: string[]) => void
}

type FormValues = {
	[key: string]: string[]
}

export const RHFMultiSelect = ({
	name,
	label,
	options,
	description,
	disabled,
	placeholder = 'Select options',
	searchPlaceholder = 'Search options...',
	emptyState = 'No options found.',
	formItemClassName,
	triggerClassName,
	badgeClassName,
	onChange,
}: Props) => {
	const { control } = useFormContext<FormValues>()

	const handleSelect = (
		value: string,
		field: ControllerRenderProps<FormValues, string>,
	) => {
		const currentValues = field.value || []
		const newValues = currentValues.includes(value)
			? currentValues.filter((v: string) => v !== value)
			: [...currentValues, value]
		field.onChange(newValues)
		onChange?.(newValues)
	}

	const handleDeselect = (
		value: string,
		field: ControllerRenderProps<FormValues, string>,
	) => {
		const currentValues = field.value || []
		const updatedValues = currentValues.filter((v: string) => v !== value)
		field.onChange(updatedValues)
		onChange?.(updatedValues)
	}

	return (
		<FormField
			name={name}
			control={control}
			render={({ field }) => {
				const selectedValues = field.value || []
				const selectedOptions = options.filter((opt) =>
					selectedValues.includes(opt.value),
				)

				return (
					<FormItem className={formItemClassName ?? 'flex flex-col gap-1'}>
						<FormLabel>{label}</FormLabel>
						<Popover>
							<PopoverTrigger asChild>
								<FormControl>
									<Button
										type="button"
										variant="outline"
										disabled={disabled}
										className={cn(
											'w-full justify-between',
											!selectedValues.length && 'text-muted-foreground',
											triggerClassName,
										)}
									>
										{selectedValues.length > 0
											? `${selectedValues.length} selected`
											: placeholder}
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</FormControl>
							</PopoverTrigger>
							<PopoverContent className="w-full p-0" align="start">
								<Command>
									<CommandInput placeholder={searchPlaceholder} />
									<CommandList>
										<CommandEmpty>{emptyState}</CommandEmpty>
										<CommandGroup>
											{options.map((option) => (
												<CommandItem
													key={option.value}
													value={option.value}
													onSelect={() => handleSelect(option.value, field)}
												>
													<Check
														className={cn(
															'mr-2 h-4 w-4',
															selectedValues.includes(option.value)
																? 'opacity-100'
																: 'opacity-0',
														)}
													/>
													{option.label}
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>

						{selectedOptions.length > 0 && (
							<div className="flex flex-wrap gap-1">
								{selectedOptions.map((option) => (
									<Badge key={option.value} variant="secondary">
										<span className={badgeClassName}>{option.label}</span>
										<button
											type="button"
											className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
											onKeyDown={(e) => {
												if (e.key === 'Enter') {
													handleDeselect(option.value, field)
												}
											}}
											onMouseDown={(e) => {
												e.preventDefault()
												e.stopPropagation()
											}}
											onClick={() => handleDeselect(option.value, field)}
										>
											<X className="h-3 w-3" />
										</button>
									</Badge>
								))}
							</div>
						)}
						<FormDescription>{description}</FormDescription>
						<FormMessage />
					</FormItem>
				)
			}}
		/>
	)
}
