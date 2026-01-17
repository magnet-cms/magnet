'use client'

import { type ReactNode, type TextareaHTMLAttributes } from 'react'
import { useFormContext } from 'react-hook-form'

import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'

type TextareaProps = Omit<
	TextareaHTMLAttributes<HTMLTextAreaElement>,
	'name' | 'value' | 'defaultValue'
>

type Props = TextareaProps & {
	name: string
	label: string
	description?: ReactNode
	formItemClassName?: string
	textareaClassName?: string
}

export const RHFTextarea = ({
	name,
	label,
	placeholder,
	description,
	disabled,
	required,
	rows,
	formItemClassName,
	textareaClassName,
	onBlur,
	onChange,
	...rest
}: Props) => {
	const { control } = useFormContext()

	return (
		<FormField
			name={name}
			control={control}
			render={({ field }) => {
				const { className: restClassName, ...textareaProps } = rest

				return (
					<FormItem className={formItemClassName ?? 'gap-1'}>
						<FormLabel>{label}</FormLabel>
						<FormControl>
							<Textarea
								placeholder={placeholder}
								disabled={disabled}
								required={required}
								rows={rows}
								value={field.value ?? ''}
								onBlur={(event) => {
									field.onBlur()
									onBlur?.(event)
								}}
								onChange={(event) => {
									field.onChange(event)
									onChange?.(event)
								}}
								className={textareaClassName ?? restClassName ?? 'resize-none'}
								{...textareaProps}
							/>
						</FormControl>
						<FormDescription>{description}</FormDescription>
						<FormMessage />
					</FormItem>
				)
			}}
		/>
	)
}
