import { Button } from '@magnet/ui/components'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useSchemaBuilder } from '../hooks/useSchemaBuilder'
import type { ViewMode } from '../types/builder.types'

interface CodePreviewProps {
	mode: ViewMode
}

export function CodePreview({ mode }: CodePreviewProps) {
	const { generatedCode, generatedJSON } = useSchemaBuilder()
	const [copied, setCopied] = useState(false)

	const content =
		mode === 'code' ? generatedCode : JSON.stringify(generatedJSON, null, 2)

	const handleCopy = async () => {
		await navigator.clipboard.writeText(content)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<div className="h-full flex flex-col border rounded-xl overflow-hidden bg-muted/30">
			{/* Header */}
			<div className="bg-muted/50 border-b px-4 py-2 flex items-center justify-between">
				<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
					{mode === 'code' ? 'Generated TypeScript' : 'JSON Schema'}
				</h3>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 text-xs"
					onClick={handleCopy}
				>
					{copied ? (
						<>
							<Check className="h-3 w-3 mr-1.5 text-green-500" />
							Copied
						</>
					) : (
						<>
							<Copy className="h-3 w-3 mr-1.5" />
							Copy
						</>
					)}
				</Button>
			</div>

			{/* Code Content */}
			<div className="flex-1 overflow-auto p-4">
				<pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
					<code>{content}</code>
				</pre>
			</div>
		</div>
	)
}
