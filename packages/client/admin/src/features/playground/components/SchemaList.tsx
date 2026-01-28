import { Button } from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import { Plus } from 'lucide-react'

interface Schema {
  id: string
  name: string
  apiId: string
  isActive?: boolean
}

interface SchemaListProps {
  schemas: Schema[]
  activeSchemaId?: string
  onSchemaSelect: (schemaId: string) => void
  onCreateNew: () => void
}

export function SchemaList({
  schemas,
  activeSchemaId,
  onSchemaSelect,
  onCreateNew,
}: SchemaListProps) {
  return (
    <div className="w-56 bg-white border-r border-gray-200 flex flex-col hidden lg:flex">
      <div className="p-4">
        <Button onClick={onCreateNew} variant="outline" size="sm" className="w-full shadow-sm">
          <Plus className="w-4 h-4" />
          New Schema
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {schemas.map((schema) => (
          <button
            key={schema.id}
            onClick={() => onSchemaSelect(schema.id)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-md group transition-colors',
              activeSchemaId === schema.id ? 'bg-gray-50' : 'hover:bg-gray-50'
            )}
          >
            <p className="text-sm font-medium text-gray-600 group-hover:text-gray-900">
              {schema.name}
            </p>
            <p className="text-xs text-gray-400 font-mono mt-0.5 group-hover:text-gray-500">
              {schema.apiId}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
