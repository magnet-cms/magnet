'use client'

import { type EditorProps } from '@monaco-editor/react'
import { type ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'

import { FileEditor } from '../../atoms/file-editor'
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../../atoms/form'

type MonacoEditorProps = Omit<
	EditorProps,
	'value' | 'defaultValue' | 'onChange' | 'theme'
>

type Props = MonacoEditorProps & {
	name: string
	label: string
	description?: ReactNode
	formItemClassName?: string
	editorClassName?: string
	height?: string | number
	defaultLanguage?: string
	theme?: string
	options?: EditorProps['options']
}

export const RHFFileEditor = ({
	name,
	label,
	description,
	formItemClassName,
	editorClassName,
	height = '400px',
	defaultLanguage = 'javascript',
	theme,
	options,
	loading,
	onMount,
	beforeMount,
	onValidate,
	...rest
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
							<FileEditor
								width="100%"
								height={height}
								defaultLanguage={defaultLanguage}
								theme={theme}
								value={field.value ?? ''}
								onChange={(value) => {
									field.onChange(value ?? '')
								}}
								options={options}
								loading={loading}
								onMount={onMount}
								beforeMount={beforeMount}
								onValidate={onValidate}
								containerClassName={editorClassName}
								{...rest}
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
