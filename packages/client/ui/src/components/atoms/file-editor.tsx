/**
 * File Editor Component
 *
 * Reusable Monaco editor component with consistent styling and theme support
 */

'use client'

import Editor, { type EditorProps } from '@monaco-editor/react'
import { useTheme } from 'next-themes'

import { cn } from '../../lib/utils'

type FileEditorProps = Omit<EditorProps, 'theme'> & {
	className?: string
	containerClassName?: string
	theme?: string
}

export function FileEditor({
	className,
	containerClassName,
	height = '400px',
	theme: themeProp,
	options,
	beforeMount,
	...rest
}: FileEditorProps) {
	const { resolvedTheme } = useTheme()
	const editorTheme =
		themeProp ?? (resolvedTheme === 'dark' ? 'custom-dark' : 'custom-light')

	const handleBeforeMount = (
		monaco: Parameters<NonNullable<EditorProps['beforeMount']>>[0],
	) => {
		// Define custom light theme
		monaco.editor.defineTheme('custom-light', {
			base: 'vs',
			inherit: true,
			rules: [],
			colors: {
				'editor.background': '#00000000', // Transparent to use the container background
			},
		})

		// Define custom dark theme
		monaco.editor.defineTheme('custom-dark', {
			base: 'vs-dark',
			inherit: true,
			rules: [],
			colors: {
				'editor.background': '#00000000', // Transparent to use the container background
			},
		})

		// Call the original beforeMount if provided
		if (beforeMount) {
			beforeMount(monaco)
		}
	}

	return (
		<div
			className={cn(
				'border-input dark:bg-input/30 w-full min-w-0 rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] overflow-hidden',
				'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
				containerClassName,
			)}
		>
			<Editor
				height={height}
				theme={editorTheme}
				options={{
					minimap: { enabled: false },
					fontSize: 14,
					lineNumbers: 'on',
					scrollBeyondLastLine: false,
					wordWrap: 'on',
					automaticLayout: true,
					...options,
				}}
				beforeMount={handleBeforeMount}
				className={className}
				{...rest}
			/>
		</div>
	)
}
