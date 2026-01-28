import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@magnet-cms/ui'
import { useState } from 'react'

interface NewSchemaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: { name: string; singularId: string; pluralId: string }) => void
}

export function NewSchemaModal({ open, onOpenChange, onCreate }: NewSchemaModalProps) {
  const [name, setName] = useState('')
  const [singularId, setSingularId] = useState('')
  const [pluralId, setPluralId] = useState('')

  const handleSubmit = () => {
    if (name && singularId && pluralId) {
      onCreate({ name, singularId, pluralId })
      setName('')
      setSingularId('')
      setPluralId('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Schema</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="schema-name">Display Name</Label>
            <Input
              id="schema-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product Category"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="api-id">API ID (Singular)</Label>
              <Input
                id="api-id"
                value={singularId}
                onChange={(e) => setSingularId(e.target.value)}
                placeholder="product-category"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="plural-id">API ID (Plural)</Label>
              <Input
                id="plural-id"
                value={pluralId}
                onChange={(e) => setPluralId(e.target.value)}
                placeholder="product-categories"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Schema</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
