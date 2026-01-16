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
	RichTextEditor,
	type RichTextEditorProps,
} from '@/components/ui/rich-text-editor'

type Props = Omit<RichTextEditorProps, 'value' | 'onChange'> & {
	name: string
	label: string
	description?: ReactNode
	formItemClassName?: string
}

export const RHFRichText = ({
	name,
	label,
	placeholder,
	description,
	disabled,
	minHeight,
	className,
	formItemClassName,
}: Props) => {
	const { control } = useFormContext()

	return (
		<FormField
			name={name}
			control={control}
			render={({ field }) => {
				return (
					<FormItem className={formItemClassName ?? 'gap-1'}>
						<FormLabel>{label}</FormLabel>
						<FormControl>
							<RichTextEditor
								placeholder={placeholder}
								disabled={disabled}
								minHeight={minHeight}
								className={className}
								value={field.value}
								onChange={field.onChange}
							/>
						</FormControl>
						{description && <FormDescription>{description}</FormDescription>}
						<FormMessage />
					</FormItem>
				)
			}}
		/>
	)
}
