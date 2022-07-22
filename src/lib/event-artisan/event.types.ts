export type EmptyObject = { [key: string]: never }
export type UnknownObject = { [key: string]: unknown }

export interface StoredEventBaseData {
  id: string
  type: string
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface StoredEventContents<Data, Meta> {
  data: Data
  meta: Meta
}

export interface Upcaster<L = unknown> {
  upcast(event: L): this
}

export type StoredEvent<Data, Meta = EmptyObject> =
  StoredEventBaseData
  & StoredEventContents<Data, Meta>

export interface EventCraftingManifest {
  type: string
  version: number
}

export interface LegacyEventCraftingManifest {
  version: number
  target: Upcaster
}
