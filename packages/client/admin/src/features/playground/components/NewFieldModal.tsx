import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import {
  AtSign,
  Braces,
  Calendar,
  Hash,
  Image,
  Link,
  Pilcrow,
  ToggleLeft,
  Type,
} from 'lucide-react'

interface FieldType {
  id: string
  name: string
  icon: typeof Type
  color: string
}

interface NewFieldModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectType: (type: string) => void
}

const fieldTypes: FieldType[] = [
  { id: 'text', name: 'Text', icon: Type, color: 'bg-blue-50 text-blue-600' },
  {
    id: 'rich-text',
    name: 'Rich Text',
    icon: Pilcrow,
    color: 'bg-indigo-50 text-indigo-600',
  },
  { id: 'number', name: 'Number', icon: Hash, color: 'bg-orange-50 text-orange-600' },
  {
    id: 'date',
    name: 'Date',
    icon: Calendar,
    color: 'bg-green-50 text-green-600',
  },
  {
    id: 'boolean',
    name: 'Boolean',
    icon: ToggleLeft,
    color: 'bg-cyan-50 text-cyan-600',
  },
  {
    id: 'relation',
    name: 'Relation',
    icon: Link,
    color: 'bg-purple-50 text-purple-600',
  },
  { id: 'email', name: 'Email', icon: AtSign, color: 'bg-teal-50 text-teal-600' },
  { id: 'media', name: 'Media', icon: Image, color: 'bg-pink-50 text-pink-600' },
  { id: 'json', name: 'JSON', icon: Braces, color: 'bg-yellow-50 text-yellow-600' },
]

export function NewFieldModal({ open, onOpenChange, onSelectType }: NewFieldModalProps) {
  const handleSelect = (typeId: string) => {
    onSelectType(typeId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select a field type</DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {fieldTypes.map((fieldType) => {
              const Icon = fieldType.icon
              return (
                <button
                  key={fieldType.id}
                  onClick={() => handleSelect(fieldType.id)}
                  className="flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:ring-1 hover:ring-blue-300 hover:bg-blue-50/30 transition-all group text-center"
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform',
                      fieldType.color
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{fieldType.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
