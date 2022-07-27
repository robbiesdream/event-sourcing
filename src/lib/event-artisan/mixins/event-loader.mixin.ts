import {StoredEvent} from "../event.types";
import {MixinArtisan} from "@doesrobbiedream/ts-utils";

export class EventLoader implements StoredEvent {
  type: string;
  version: number;

  id: string
  data: unknown
  meta: unknown

  createdAt: Date;
  updatedAt: Date;

  fromStoredData<Data = unknown, Meta = unknown>(event: StoredEvent<Data, Meta>) {
    this.id = event.id
    this.data = event.data
    this.meta = event.meta

    this.updatedAt = event.updatedAt
    this.createdAt = event.createdAt
  }

  fromRawData<Data = unknown, Meta = unknown>(data: Data, meta: Meta) {
    this.data = data
    this.meta = meta
  }

}

export const EventLoaderMixin = MixinArtisan.craft(EventLoader)
