import {StoredEvent} from "../../event-artisan/event.types";
import {randomUUID} from "crypto";

export type TypeFromStoredEvent<T extends StoredEvent> = T['type']
export type DataFromStoredEvent<T extends StoredEvent> = T extends StoredEvent<infer Data> ? Data : never

export function createEventFromData<T extends StoredEvent>(type: TypeFromStoredEvent<T>, version: number, data: DataFromStoredEvent<T>, overwrite: Record<string, unknown> = {}): T {
  return {
    id: randomUUID(),
    type,
    data,
    updatedAt: new Date(Date.now()),
    createdAt: new Date(Date.now()),
    meta: {},
    version,
    ...overwrite
  } as T
}
