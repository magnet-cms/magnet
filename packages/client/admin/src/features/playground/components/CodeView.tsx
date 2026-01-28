import { Button, Card, CardContent } from '@magnet-cms/ui'
import { Copy } from 'lucide-react'
import { useState } from 'react'

interface CodeViewProps {
  schemaName: string
  fields: Array<{ name: string; type: string; required?: boolean }>
}

export function CodeView({ schemaName, fields }: CodeViewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const code = generateTypeScriptInterface(schemaName, fields)
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const generateTypeScriptInterface = (
    name: string,
    fieldList: Array<{ name: string; type: string; required?: boolean }>
  ): string => {
    const interfaceName = name.charAt(0).toUpperCase() + name.slice(1)
    let code = `import { Relation } from '@strapi/types';\n\n`
    code += `/**\n * ${interfaceName} Collection Type\n */\n`
    code += `export interface ${interfaceName} {\n`
    code += `  id: number;\n`

    fieldList.forEach((field) => {
      const optional = field.required ? '' : '?'
      const tsType = mapFieldTypeToTS(field.type)
      code += `  ${field.name}${optional}: ${tsType};\n`
    })

    code += `  createdAt: Date;\n`
    code += `  updatedAt: Date;\n`
    code += `}`

    return code
  }

  const mapFieldTypeToTS = (type: string): string => {
    const typeMap: Record<string, string> = {
      string: 'string',
      text: 'string',
      email: 'string',
      password: 'string',
      number: 'number',
      integer: 'number',
      boolean: 'boolean',
      date: 'Date',
      datetime: 'Date',
      json: 'Record<string, unknown>',
      relation: 'Relation<unknown, unknown>',
    }
    return typeMap[type] || 'unknown'
  }

  const code = generateTypeScriptInterface(schemaName, fields)

  return (
    <div className="flex-1 w-full bg-white p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">TypeScript Interface</h2>
          <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs">
            <Copy className="w-3 h-3" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <Card className="bg-gray-50 border border-gray-200">
          <CardContent className="p-4 font-mono text-sm leading-relaxed overflow-x-auto">
            <pre className="text-gray-900 whitespace-pre-wrap">{code}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
