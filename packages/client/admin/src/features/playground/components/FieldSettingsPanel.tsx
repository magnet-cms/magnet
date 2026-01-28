import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@magnet-cms/ui'
import { ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface FieldSettingsPanelProps {
  field: {
    name: string
    displayName: string
    type: string
  } | null
}

export function FieldSettingsPanel({ field }: FieldSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <aside className="w-80 bg-white border-l border-gray-200 hidden md:flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Field Settings
        </h3>
      </div>
      <ScrollArea className="flex-1">
        {field ? (
          <div className="p-4 space-y-6">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left mb-4 group">
                  <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Basic Info
                  </span>
                  <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Display Name
                    </label>
                    <input
                      type="text"
                      defaultValue={field.displayName}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-700 mb-1.5">UI Type</Label>
                    <Select defaultValue="text-input">
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text-input">Text Input</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full min-h-[400px] p-8">
            <div className="text-center">
              <p className="text-sm text-gray-500">Select a field</p>
            </div>
          </div>
        )}
      </ScrollArea>
    </aside>
  )
}
