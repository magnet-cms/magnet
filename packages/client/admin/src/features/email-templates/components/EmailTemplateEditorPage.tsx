'use client'

import { CodeNode } from '@lexical/code'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { useQuery } from '@tanstack/react-query'
import {
	$getRoot,
	$insertNodes,
	COMMAND_PRIORITY_EDITOR,
	type LexicalCommand,
	createCommand,
} from 'lexical'
import { Eye } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
	$createVariableBadgeNode,
	VariableBadgeNode,
	VariableBadgeTransformPlugin,
} from './VariableBadgeNode'

import {
	Badge,
	Button,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Skeleton,
} from '@magnet-cms/ui'
import { ContentHeader } from '~/components/ContentHeader'
import type { LocaleOption } from '~/components/LocaleSwitcher'
import { useAdapter } from '~/core/provider/MagnetProvider'
import {
	useEmailTemplateCreate,
	useEmailTemplateDetail,
	useEmailTemplateTestSend,
	useEmailTemplateUpdate,
	useEmailTemplateVersions,
	useEmailTemplatesBySlug,
} from '~/hooks/useEmailTemplates'
import { useAppIntl } from '~/i18n'

// ============================================================================
// Lexical theme (matches rich-text-editor.tsx)
// ============================================================================

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
	quote:
		'border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground mb-2',
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

const EDITOR_NODES = [
	CodeNode,
	AutoLinkNode,
	LinkNode,
	ListItemNode,
	ListNode,
	HeadingNode,
	QuoteNode,
	VariableBadgeNode,
]

// ============================================================================
// Insert Variable Command + Plugin
// ============================================================================

const INSERT_VARIABLE_COMMAND: LexicalCommand<string> = createCommand(
	'INSERT_VARIABLE_COMMAND',
)

function InsertVariablePlugin({ variables }: { variables: string[] }) {
	const [editor] = useLexicalComposerContext()

	useEffect(() => {
		return editor.registerCommand<string>(
			INSERT_VARIABLE_COMMAND,
			(variableName) => {
				editor.update(() => {
					$insertNodes([$createVariableBadgeNode(variableName)])
				})
				return true
			},
			COMMAND_PRIORITY_EDITOR,
		)
	}, [editor])

	if (variables.length === 0) return null

	return (
		<div className="flex flex-wrap gap-1 px-2 py-1.5 border-b bg-muted/20">
			<span className="text-xs text-muted-foreground mr-1 self-center">
				Variables:
			</span>
			{variables.map((v) => (
				<button
					key={v}
					type="button"
					onClick={() => editor.dispatchCommand(INSERT_VARIABLE_COMMAND, v)}
					className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 font-mono border"
				>
					{`{{ ${v} }}`}
				</button>
			))}
		</div>
	)
}

// ============================================================================
// Main editor page
// ============================================================================

export function EmailTemplateEditorPage() {
	const intl = useAppIntl()
	const navigate = useNavigate()
	const { id } = useParams<{ id: string }>()
	const isNew = !id || id === 'new'

	const { data: template, isLoading } = useEmailTemplateDetail(
		isNew ? '' : (id ?? ''),
	)
	const { data: versions } = useEmailTemplateVersions(isNew ? '' : (id ?? ''))

	const createMutation = useEmailTemplateCreate()
	const updateMutation = useEmailTemplateUpdate()
	const testSendMutation = useEmailTemplateTestSend()

	const [slug, setSlug] = useState('')
	const [subject, setSubject] = useState('')
	const [category, setCategory] = useState('transactional')
	const [locale, setLocale] = useState('en')
	const [variables, setVariables] = useState<string[]>([])
	const [variableInput, setVariableInput] = useState('')
	const [body, setBody] = useState('')
	const [showVersions, setShowVersions] = useState(false)

	// Populate form from existing template
	useEffect(() => {
		if (template) {
			setSlug(template.slug)
			setSubject(template.subject)
			setCategory(template.category)
			setLocale(template.locale)
			setVariables(template.variables ?? [])
			setBody(template.body)
		}
	}, [template])

	const handleBodyChange = useCallback((html: string) => {
		setBody(html)
	}, [])

	const handleSave = () => {
		if (isNew) {
			createMutation.mutate(
				{ slug, subject, body, category, locale, variables },
				{
					onSuccess: (created) => {
						toast.success(
							intl.formatMessage({
								id: 'emailTemplates.toast.created',
								defaultMessage: 'Template created',
							}),
						)
						navigate(`/email-templates/${created.id}`)
					},
					onError: (err) => toast.error(err.message),
				},
			)
		} else {
			updateMutation.mutate(
				{ id: id as string, data: { subject, body, category, variables } },
				{
					onSuccess: () =>
						toast.success(
							intl.formatMessage({
								id: 'emailTemplates.toast.saved',
								defaultMessage: 'Template saved',
							}),
						),
					onError: (err) => toast.error(err.message),
				},
			)
		}
	}

	const handleTestSend = () => {
		if (!id || isNew) return
		testSendMutation.mutate(
			{ id, data: {} },
			{
				onSuccess: () =>
					toast.success(
						intl.formatMessage({
							id: 'emailTemplates.toast.testSent',
							defaultMessage: 'Test email sent to your address',
						}),
					),
				onError: (err) => toast.error(err.message),
			},
		)
	}

	const addVariable = () => {
		const v = variableInput.trim()
		if (v && !variables.includes(v)) {
			setVariables([...variables, v])
			setVariableInput('')
		}
	}

	const isSaving = createMutation.isPending || updateMutation.isPending

	// Locale data — only fetch when editing an existing template
	const adapter = useAdapter()
	const { data: variants } = useEmailTemplatesBySlug(template?.slug ?? '')
	const { data: localesConfig } = useQuery({
		queryKey: ['settings', 'locales'],
		queryFn: () => adapter.settings.getLocales(),
		enabled: !isNew,
	})

	const availableLocales: LocaleOption[] = useMemo(() => {
		if (!localesConfig) {
			return template ? [{ code: template.locale, name: template.locale }] : []
		}
		return localesConfig.configured.map((code: string) => {
			const entry = localesConfig.available.find(
				(l: { key: string; value: string }) => l.value === code,
			)
			return { code, name: entry?.key ?? code }
		})
	}, [localesConfig, template])

	const localeStatuses = useMemo(() => {
		const statuses: Record<
			string,
			{ hasDraft: boolean; hasPublished: boolean }
		> = {}
		for (const v of variants ?? []) {
			statuses[v.locale] = { hasDraft: true, hasPublished: false }
		}
		return statuses
	}, [variants])

	const handleLocaleChange = useCallback(
		(newLocale: string) => {
			const variant = variants?.find((v) => v.locale === newLocale)
			if (variant) {
				navigate(`/email-templates/${variant.id}`)
			}
		},
		[variants, navigate],
	)

	const clientPreviewDoc = body
		? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;background:#f5f5f5;font-family:sans-serif}.container{max-width:600px;margin:0 auto;background:#fff;padding:32px;border-radius:8px;word-break:break-word}</style></head><body><div class="container">${body}</div></body></html>`
		: ''

	if (isLoading && !isNew) {
		return (
			<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative">
				<Skeleton className="h-16 w-full" />
				<div className="flex-1 p-6 space-y-4">
					<Skeleton className="h-10 w-64" />
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		)
	}

	const editorKey = template?.id ?? 'new'

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative">
			<ContentHeader
				title={
					isNew
						? intl.formatMessage({
								id: 'emailTemplates.editor.titleNew',
								defaultMessage: 'New Template',
							})
						: (template?.slug ?? '')
				}
				onSave={handleSave}
				isSaving={isSaving}
				saveLabel={intl.formatMessage({
					id: 'emailTemplates.editor.save',
					defaultMessage: 'Save',
				})}
				localeProps={
					!isNew && template?.slug
						? {
								currentLocale: template.locale,
								locales: availableLocales,
								localeStatuses,
								onLocaleChange: handleLocaleChange,
							}
						: undefined
				}
				moreMenuItems={[
					{
						label: intl.formatMessage({
							id: 'emailTemplates.editor.backToList',
							defaultMessage: 'Back to Templates',
						}),
						onClick: () => navigate('/email-templates'),
					},
					...(!isNew
						? [
								{
									label: intl.formatMessage({
										id: 'emailTemplates.editor.versions',
										defaultMessage: 'History',
									}),
									onClick: () => setShowVersions(!showVersions),
								},
								{
									label: intl.formatMessage({
										id: 'emailTemplates.editor.testSend',
										defaultMessage: 'Send Test',
									}),
									onClick: handleTestSend,
								},
							]
						: []),
				]}
			/>

			<div className="flex-1 overflow-auto">
				<div className="p-6 space-y-6">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Left: form */}
						<div className="space-y-4">
							{/* Slug */}
							<div className="space-y-1.5">
								<Label>
									{intl.formatMessage({
										id: 'emailTemplates.editor.slug',
										defaultMessage: 'Slug',
									})}
								</Label>
								<Input
									value={slug}
									onChange={(e) => setSlug(e.target.value)}
									disabled={!isNew}
									placeholder="welcome"
									className="font-mono"
								/>
							</div>

							{/* Subject */}
							<div className="space-y-1.5">
								<Label>
									{intl.formatMessage({
										id: 'emailTemplates.editor.subject',
										defaultMessage: 'Subject',
									})}
								</Label>
								<Input
									value={subject}
									onChange={(e) => setSubject(e.target.value)}
									placeholder="Welcome{{#if name}}, {{name}}{{/if}}!"
								/>
							</div>

							{/* Category + Locale */}
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<Label>
										{intl.formatMessage({
											id: 'emailTemplates.editor.category',
											defaultMessage: 'Category',
										})}
									</Label>
									<Select value={category} onValueChange={setCategory}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="transactional">
												Transactional
											</SelectItem>
											<SelectItem value="marketing">Marketing</SelectItem>
											<SelectItem value="system">System</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1.5">
									<Label>
										{intl.formatMessage({
											id: 'emailTemplates.editor.locale',
											defaultMessage: 'Locale',
										})}
									</Label>
									<Input
										value={locale}
										onChange={(e) => setLocale(e.target.value)}
										placeholder="en"
										disabled={!isNew}
									/>
								</div>
							</div>

							{/* Variables */}
							<div className="space-y-1.5">
								<Label>
									{intl.formatMessage({
										id: 'emailTemplates.editor.variables',
										defaultMessage: 'Variables',
									})}
								</Label>
								<div className="flex gap-2">
									<Input
										value={variableInput}
										onChange={(e) => setVariableInput(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault()
												addVariable()
											}
										}}
										placeholder="userName"
										className="font-mono"
									/>
									<Button type="button" variant="outline" onClick={addVariable}>
										Add
									</Button>
								</div>
								{variables.length > 0 && (
									<div className="flex flex-wrap gap-1 mt-1">
										{variables.map((v) => (
											<Badge
												key={v}
												variant="secondary"
												className="cursor-pointer font-mono"
												onClick={() =>
													setVariables(variables.filter((x) => x !== v))
												}
											>
												{v} ×
											</Badge>
										))}
									</div>
								)}
							</div>

							{/* Body — custom Lexical editor with HTML I/O */}
							<div className="space-y-1.5">
								<Label>
									{intl.formatMessage({
										id: 'emailTemplates.editor.body',
										defaultMessage: 'Body',
									})}
								</Label>
								<div className="relative border rounded-md overflow-hidden">
									<LexicalComposer
										key={editorKey}
										initialConfig={{
											namespace: 'EmailTemplateEditor',
											theme,
											nodes: EDITOR_NODES,
											onError: (err) => console.error(err),
											editorState: template?.body
												? (editor) => {
														const parser = new DOMParser()
														const dom = parser.parseFromString(
															template.body,
															'text/html',
														)
														const nodes = $generateNodesFromDOM(editor, dom)
														const root = $getRoot()
														root.clear()
														if (nodes.length > 0) root.append(...nodes)
													}
												: undefined,
										}}
									>
										<InsertVariablePlugin variables={variables} />
										<VariableBadgeTransformPlugin />
										<RichTextPlugin
											contentEditable={
												<ContentEditable className="min-h-[240px] p-3 outline-none text-sm" />
											}
											placeholder={
												<div className="absolute top-[100px] left-3 text-muted-foreground pointer-events-none text-sm">
													Write your email body here…
												</div>
											}
											ErrorBoundary={LexicalErrorBoundary}
										/>
										<OnChangePlugin
											onChange={(_, editor) => {
												editor.read(() => {
													const html = $generateHtmlFromNodes(editor)
													handleBodyChange(html)
												})
											}}
										/>
										<HistoryPlugin />
										<ListPlugin />
										<LinkPlugin />
									</LexicalComposer>
								</div>
							</div>
						</div>

						{/* Right: preview pane */}
						<div className="space-y-3">
							<div className="flex items-center gap-2">
								<Eye className="h-4 w-4 text-muted-foreground" />
								<Label>
									{intl.formatMessage({
										id: 'emailTemplates.editor.preview',
										defaultMessage: 'Preview',
									})}
								</Label>
							</div>

							{/* Subject literal */}
							{subject && (
								<div className="text-sm font-medium border rounded-md px-3 py-2 bg-muted/30">
									<span className="text-muted-foreground text-xs mr-1">
										Subject:
									</span>
									{subject}
								</div>
							)}

							{/* Preview iframe — client-side, no API call */}
							<div
								className="border rounded-md overflow-hidden"
								style={{ height: '480px' }}
							>
								{clientPreviewDoc ? (
									<iframe
										title="Email Preview"
										srcDoc={clientPreviewDoc}
										className="w-full h-full"
										sandbox="allow-same-origin"
									/>
								) : (
									<div className="flex items-center justify-center h-full text-muted-foreground text-sm">
										{intl.formatMessage({
											id: 'emailTemplates.editor.previewEmpty',
											defaultMessage: 'Start typing to see a live preview',
										})}
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Version history panel */}
					{showVersions && versions && versions.length > 0 && (
						<div className="border rounded-md p-4 space-y-2">
							<h3 className="text-sm font-semibold">
								{intl.formatMessage({
									id: 'emailTemplates.editor.versionHistory',
									defaultMessage: 'Version History',
								})}
							</h3>
							<div className="space-y-2">
								{versions.map((v) => (
									<div
										key={v.editedAt}
										className="flex items-center justify-between text-sm border rounded px-3 py-2"
									>
										<div>
											<span className="font-medium">{v.subject}</span>
											<span className="text-muted-foreground ml-2 text-xs">
												{v.editedBy} · {new Date(v.editedAt).toLocaleString()}
											</span>
										</div>
										<Button
											size="sm"
											variant="outline"
											onClick={() => {
												setSubject(v.subject)
												setBody(v.body)
												toast.info(
													intl.formatMessage({
														id: 'emailTemplates.editor.versionRestored',
														defaultMessage: 'Version restored — save to apply',
													}),
												)
											}}
										>
											{intl.formatMessage({
												id: 'emailTemplates.editor.restore',
												defaultMessage: 'Restore',
											})}
										</Button>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
