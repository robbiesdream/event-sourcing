import {EmptyObject, StoredEvent} from "../event.types";
import {MixinArtisan} from "@doesrobbiedream/ts-utils";

export class EventLoader implements StoredEvent<unknown, unknown> {
  type: string;
  version: number;

  id: string
  data: unknown
  meta: unknown

  createdAt: Date;
  updatedAt: Date;

  fromStoredData<Data = unknown, Meta = EmptyObject>(event: StoredEvent<Data, Meta>) {
    this.id = event.id
    this.data = event.data
    this.meta = event.meta

    this.updatedAt = event.updatedAt
    this.createdAt = event.createdAt
  }

  fromRawData<Data = unknown, Meta = EmptyObject>(data: Data, meta: Meta) {
    this.data = data
    this.meta = meta
  }

}

// export function EventLoaderMixin<Data, Meta>(){
//   return MixinArtisan.craft(EventLoader<Data,Meta>)
// }
export const EventLoaderMixin = MixinArtisan.craft(EventLoader)
