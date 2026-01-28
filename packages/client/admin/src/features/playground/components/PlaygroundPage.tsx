import { Button } from '@magnet-cms/ui'
import { Book, Rocket } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '../../shared'

import {
  BuilderView,
  CodeView,
  FieldSettingsPanel,
  JsonView,
  NewFieldModal,
  NewSchemaModal,
  SchemaList,
  ViewTabs,
} from './index'

type ViewType = 'builder' | 'json' | 'code'

interface Schema {
  id: string
  name: string
  apiId: string
  displayName: string
}

interface Field {
  id: string
  name: string
  apiId: string
  type: string
  required: boolean
  displayName: string
}

// Mock data
const mockSchemas: Schema[] = [
  { id: '1', name: 'User', apiId: 'user', displayName: 'User' },
  { id: '2', name: 'Media', apiId: 'media', displayName: 'Media' },
  { id: '3', name: 'Cat', apiId: 'cat', displayName: 'Cat' },
]

const mockFields: Field[] = [
  {
    id: '1',
    name: 'email',
    apiId: 'email',
    type: 'email',
    required: true,
    displayName: 'email',
  },
  {
    id: '2',
    name: 'password',
    apiId: 'password',
    type: 'password',
    required: true,
    displayName: 'password',
  },
]

const mockSchemaData = {
  kind: 'collectionType',
  collectionName: 'users',
  info: {
    singularName: 'user',
    pluralName: 'users',
    displayName: 'User',
    description: '',
  },
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {},
  attributes: {
    username: {
      type: 'string',
      required: true,
      unique: true,
    },
    email: {
      type: 'email',
      required: true,
      unique: true,
    },
    provider: {
      type: 'string',
    },
    password: {
      type: 'password',
      private: true,
    },
    role: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'plugin::users-permissions.role',
      inversedBy: 'users',
    },
  },
}

export function PlaygroundPage() {
  const [activeView, setActiveView] = useState<ViewType>('builder')
  const [activeSchemaId, setActiveSchemaId] = useState<string>('1')
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [isNewSchemaModalOpen, setIsNewSchemaModalOpen] = useState(false)
  const [isNewFieldModalOpen, setIsNewFieldModalOpen] = useState(false)

  const activeSchema = mockSchemas.find((s) => s.id === activeSchemaId)
  const selectedField = selectedFieldId
    ? (mockFields.find((f) => f.id === selectedFieldId) ?? null)
    : null

  const handleFieldSelect = (fieldId: string) => {
    setSelectedFieldId(fieldId)
  }

  const handleCreateSchema = (data: { name: string; singularId: string; pluralId: string }) => {
    console.log('Create schema:', data)
    // In a real app, this would create the schema
  }

  const handleSelectFieldType = (type: string) => {
    console.log('Select field type:', type)
    // In a real app, this would add a new field
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
      {/* Header */}
      <PageHeader>
        {/* Toolbar: Title & Actions */}
        <div className="h-16 flex items-center justify-between px-6">
          {/* Left: Title */}
          <div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Playground</h1>
            <p className="text-xs text-gray-500">Build and manage content schemas</p>
          </div>

          {/* Center: View Toggle */}
          <ViewTabs activeView={activeView} onViewChange={setActiveView} />

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Book className="w-3.5 h-3.5" />
              Preview API
            </Button>
            <Button size="sm">
              <Rocket className="w-3.5 h-3.5" />
              Deploy Changes
            </Button>
          </div>
        </div>
      </PageHeader>

      {/* Views Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Schema List */}
        <SchemaList
          schemas={mockSchemas}
          activeSchemaId={activeSchemaId}
          onSchemaSelect={setActiveSchemaId}
          onCreateNew={() => setIsNewSchemaModalOpen(true)}
        />

        {/* Main Views */}
        {activeView === 'builder' && (
          <>
            <BuilderView
              fields={mockFields}
              onFieldSelect={handleFieldSelect}
              onAddField={() => setIsNewFieldModalOpen(true)}
            />
            <FieldSettingsPanel
              field={
                selectedField
                  ? {
                      name: selectedField.name,
                      displayName: selectedField.displayName,
                      type: selectedField.type,
                    }
                  : null
              }
            />
          </>
        )}

        {activeView === 'json' && <JsonView schemaData={mockSchemaData} />}

        {activeView === 'code' && (
          <CodeView
            schemaName={activeSchema?.name || 'User'}
            fields={mockFields.map((f) => ({
              name: f.name,
              type: f.type,
              required: f.required,
            }))}
          />
        )}
      </div>

      {/* Modals */}
      <NewSchemaModal
        open={isNewSchemaModalOpen}
        onOpenChange={setIsNewSchemaModalOpen}
        onCreate={handleCreateSchema}
      />
      <NewFieldModal
        open={isNewFieldModalOpen}
        onOpenChange={setIsNewFieldModalOpen}
        onSelectType={handleSelectFieldType}
      />
    </div>
  )
}
