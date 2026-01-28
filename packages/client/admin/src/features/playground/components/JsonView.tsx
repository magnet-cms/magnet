import { Button, Card, CardContent } from '@magnet-cms/ui'
import { Copy } from 'lucide-react'
import { useState } from 'react'

interface JsonViewProps {
  schemaData: Record<string, unknown>
}

export function JsonView({ schemaData }: JsonViewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(schemaData, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const jsonString = JSON.stringify(schemaData, null, 2)

  return (
    <div className="flex-1 w-full bg-white p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Schema JSON</h2>
          <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs">
            <Copy className="w-3 h-3" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <Card className="bg-gray-50 border border-gray-200">
          <CardContent className="p-4 font-mono text-sm leading-relaxed overflow-x-auto">
            <pre className="text-gray-900 whitespace-pre-wrap">{jsonString}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
