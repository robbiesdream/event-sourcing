import {MixinArtisan} from "@doesrobbiedream/ts-utils";

export class EventSerializer {
  serialize() {
    console.log(Reflect.ownKeys(this))
    return [...Object.getOwnPropertyNames(this), 'version', 'type'].reduce((serialization, key: string) => {
      const propertyKey = key as keyof this
      return {...serialization, [propertyKey]: this[propertyKey]}
    }, {})
  }
}

export const EventSerializerMixin = MixinArtisan.craft(EventSerializer)
