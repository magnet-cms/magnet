'use client'

import { CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { TRANSFORMERS } from '@lexical/markdown'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
	$getSelection,
	$isRangeSelection,
	FORMAT_TEXT_COMMAND,
	type EditorState,
} from 'lexical'
import { Bold, Code, Italic, Strikethrough, Underline } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { cn } from '@/lib'
import { Toggle } from './toggle'

const theme = {
	paragraph: 'mb-2 last:mb-0',
	heading: {
		h1: 'text-2xl font-bold mb-3',
		h2: 'text-xl font-bold mb-2',
		h3: 'text-lg font-semibold mb-2',
	},
	list: {
		ul: 'list-disc ml-4 mb-2',
		ol: 'list-decimal ml-4 mb-2',
		listitem: 'mb-1',
	},
	quote: 'border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground mb-2',
	text: {
		bold: 'font-bold',
		italic: 'italic',
		underline: 'underline',
		strikethrough: 'line-through',
		code: 'bg-muted px-1 py-0.5 rounded font-mono text-sm',
	},
	code: 'bg-muted p-3 rounded font-mono text-sm mb-2 block overflow-x-auto',
	link: 'text-primary underline cursor-pointer',
}

function ToolbarPlugin() {
	const [editor] = useLexicalComposerContext()
	const [isBold, setIsBold] = useState(false)
	const [isItalic, setIsItalic] = useState(false)
	const [isUnderline, setIsUnderline] = useState(false)
	const [isStrikethrough, setIsStrikethrough] = useState(false)
	const [isCode, setIsCode] = useState(false)

	const updateToolbar = useCallback(() => {
		const selection = $getSelection()
		if ($isRangeSelection(selection)) {
			setIsBold(selection.hasFormat('bold'))
			setIsItalic(selection.hasFormat('italic'))
			setIsUnderline(selection.hasFormat('underline'))
			setIsStrikethrough(selection.hasFormat('strikethrough'))
			setIsCode(selection.hasFormat('code'))
		}
	}, [])

	useEffect(() => {
		return editor.registerUpdateListener(({ editorState }) => {
			editorState.read(() => {
				updateToolbar()
			})
		})
	}, [editor, updateToolbar])

	return (
		<div className="flex items-center gap-0.5 p-1 border-b bg-muted/30">
			<Toggle
				size="sm"
				pressed={isBold}
				onPressedChange={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')
				}}
				aria-label="Bold"
			>
				<Bold className="h-4 w-4" />
			</Toggle>
			<Toggle
				size="sm"
				pressed={isItalic}
				onPressedChange={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
				}}
				aria-label="Italic"
			>
				<Italic className="h-4 w-4" />
			</Toggle>
			<Toggle
				size="sm"
				pressed={isUnderline}
				onPressedChange={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')
				}}
				aria-label="Underline"
			>
				<Underline className="h-4 w-4" />
			</Toggle>
			<Toggle
				size="sm"
				pressed={isStrikethrough}
				onPressedChange={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
				}}
				aria-label="Strikethrough"
			>
				<Strikethrough className="h-4 w-4" />
			</Toggle>
			<div className="w-px h-4 bg-border mx-1" />
			<Toggle
				size="sm"
				pressed={isCode}
				onPressedChange={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')
				}}
				aria-label="Code"
			>
				<Code className="h-4 w-4" />
			</Toggle>
		</div>
	)
}

function Placeholder({ text }: { text: string }) {
	return (
		<div className="absolute top-[49px] left-3 text-muted-foreground pointer-events-none select-none">
			{text}
		</div>
	)
}

export interface RichTextEditorProps {
	value?: string
	onChange?: (value: string) => void
	placeholder?: string
	className?: string
	disabled?: boolean
	minHeight?: string
}

export function RichTextEditor({
	value: _value,
	onChange,
	placeholder = 'Start writing...',
	className,
	disabled = false,
	minHeight = '150px',
}: RichTextEditorProps) {
	// Note: value is currently not used for initial state - Lexical manages its own state
	// This can be enhanced to support controlled mode with editorState serialization
	const initialConfig = {
		namespace: 'RichTextEditor',
		theme,
		onError: (error: Error) => {
			console.error('Lexical error:', error)
		},
		nodes: [
			HeadingNode,
			QuoteNode,
			ListNode,
			ListItemNode,
			CodeNode,
			LinkNode,
			AutoLinkNode,
		],
		editable: !disabled,
	}

	const handleChange = useCallback(
		(editorState: EditorState) => {
			editorState.read(() => {
				const json = JSON.stringify(editorState.toJSON())
				onChange?.(json)
			})
		},
		[onChange],
	)

	return (
		<LexicalComposer initialConfig={initialConfig}>
			<div
				className={cn(
					'relative rounded-md border bg-background overflow-hidden',
					'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
					disabled && 'opacity-50 cursor-not-allowed',
					className,
				)}
			>
				<ToolbarPlugin />
				<RichTextPlugin
					contentEditable={
						<ContentEditable
							className={cn(
								'outline-none p-3 prose prose-sm max-w-none',
								'dark:prose-invert',
							)}
							style={{ minHeight }}
						/>
					}
					placeholder={<Placeholder text={placeholder} />}
					ErrorBoundary={LexicalErrorBoundary}
				/>
				<OnChangePlugin onChange={handleChange} />
				<HistoryPlugin />
				<ListPlugin />
				<LinkPlugin />
				<MarkdownShortcutPlugin transformers={TRANSFORMERS} />
			</div>
		</LexicalComposer>
	)
}
