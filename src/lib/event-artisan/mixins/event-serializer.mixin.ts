import {MixinArtisan} from "@doesrobbiedream/ts-utils";
import {StoredEvent} from "../event.types";

export class EventSerializer {
  serialize(): StoredEvent {
    return [...Object.getOwnPropertyNames(this), 'version', 'type'].reduce((serialization, key: string) => {
      const propertyKey = key as keyof this
      return {...serialization, [propertyKey]: this[propertyKey]}
    }, {}) as StoredEvent
  }
}

export const EventSerializerMixin = MixinArtisan.craft(EventSerializer)
