import { Alert, Card } from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import { GripVertical, Info, Pencil, Plus, Type } from 'lucide-react'
import { useState } from 'react'

interface Field {
  id: string
  name: string
  apiId: string
  type: string
  required: boolean
  isActive?: boolean
}

interface BuilderViewProps {
  fields: Field[]
  onFieldSelect: (fieldId: string) => void
  onAddField: () => void
}

export function BuilderView({ fields, onFieldSelect, onAddField }: BuilderViewProps) {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)

  return (
    <div className="flex-1 bg-gray-50/50 p-4 sm:p-6 overflow-y-auto">
      <Alert className="mb-6 bg-blue-50 border-blue-100">
        <Info className="w-5 h-5 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-700">
          <span className="font-medium">Schema Guidelines:</span> Keep field names in camelCase.
        </p>
      </Alert>

      <Card className="shadow-sm border border-gray-200 gap-0 p-0">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/30">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Fields ({fields.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {fields.map((field) => {
            const isActive = selectedFieldId === field.id
            return (
              <div
                key={field.id}
                onClick={() => {
                  setSelectedFieldId(field.id)
                  onFieldSelect(field.id)
                }}
                className={cn(
                  'flex items-center gap-4 p-4 group transition-colors cursor-pointer relative',
                  isActive && 'bg-gray-50'
                )}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-900" />}
                <GripVertical className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 cursor-move" />
                <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Type className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{field.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 border border-gray-200 font-mono">
                      {field.apiId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{field.type}</span>
                    {field.required && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Required
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-2 transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  )}
                >
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <button
          onClick={onAddField}
          className="w-full py-3 border-t border-dashed border-gray-300 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-center gap-2 rounded-b-lg"
        >
          <Plus className="w-4 h-4" />
          Add new field
        </button>
      </Card>
    </div>
  )
}
