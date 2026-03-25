import { Field, Prop, Setting, UI } from '@magnet-cms/common'
import { IsArray } from 'class-validator'

export interface EnvironmentItem {
  id: string
  name: string
  connectionString: string
  description?: string
  isDefault: boolean
  isLocal?: boolean // true for env var environment (read-only)
}

@Setting()
export class Environments {
  // Table UI type is complex and not yet supported by Field decorators
  // Keep using @Prop/@UI for now
  @Prop({ required: false, default: [] })
  @Field.Validators(IsArray())
  @UI({
    type: 'table',
    label: 'Environments',
    description: 'Configure database environments for your application',
    columns: [
      { key: 'name', header: 'Name', type: 'text' },
      { key: 'connectionString', header: 'Connection String', type: 'code' },
      { key: 'description', header: 'Description', type: 'text' },
      { key: 'isDefault', header: 'Default', type: 'status' },
    ],
  })
  environments!: EnvironmentItem[]
}
