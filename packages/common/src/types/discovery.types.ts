export type DiscoveredController = {
  path: string
  schema: string
  methods: DiscoveredMethod[]
}

export type DiscoveredMethod = {
  name: string
  method: string
}

export type DiscoveredSchema = {
  name: string
  tableName: string
  target: string | object
}
