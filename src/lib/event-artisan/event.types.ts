export type EmptyObject = { [key: string]: never }

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

export interface Upcaster<L = unknown, T = undefined> {
  upcast(event: L): T | this
}

export type StoredEvent<Data = unknown, Meta = unknown> =
  StoredEventBaseData
  & StoredEventContents<Data, Meta>

export interface EventCraftingManifest {
  type: string
  version: number
}
