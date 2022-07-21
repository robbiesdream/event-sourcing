import {StoredEvent, StoredEventContents} from "./event.types";
import {SourceEvent} from "./source-event.class";

export class EventLoader {
  fromStoredData<D = unknown, M = unknown>(event: SourceEvent<D, M>, data: StoredEvent<D, M>) {
    event.id = data.id
    event.createdAt = data.createdAt
    event.updatedAt = data.updatedAt
    event.data = data.data
    event.meta = data.meta
  }

  fromData<D = unknown, M = unknown>(event: SourceEvent<D, M>, contents: StoredEventContents<D, M>) {
    event.data = contents.data
    event.meta = contents.meta
  }
}
