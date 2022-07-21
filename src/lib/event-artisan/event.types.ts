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

export interface Upcaster<L, T> {
  upcast(event: L): T
}

export type StoredEvent<Data, Meta = EmptyObject> =
  StoredEventBaseData
  & StoredEventContents<Data, Meta>

export interface EventCraftingManifest {
  type: string
  version: number
}

export interface LegacyEventCraftingManifest<Legacy, Target> {
  version: number
  target: Upcaster<Legacy, Target>
}
