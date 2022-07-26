import {EventCraftingManifest, Upcaster} from "./event.types";
import {SourceEvent} from "./source-event.class";
import {ExtractFromType, Type} from "@doesrobbiedream/ts-utils";

export enum EventDecoratedKeys {
  Type = 'Type',
  Version = 'Version',
  Target = 'Target',
  IsLegacy = 'IsLegacy'
}

export function EventDecoratorFactory(manifest: EventCraftingManifest) {
  return function (target: Type<SourceEvent<unknown, unknown>>) {
    Reflect.defineMetadata(EventDecoratedKeys.Type, manifest.type, target)
    Reflect.defineMetadata(EventDecoratedKeys.Version, manifest.version, target)
  }
}

export function LegacyEventDecoratorFactory<Event>(upcaster: Type<Upcaster<ExtractFromType<Event>>>) {
  return function (target: Event) {
    Reflect.defineMetadata(EventDecoratedKeys.Target, upcaster, target)
    Reflect.defineMetadata(EventDecoratedKeys.IsLegacy, true, target)
  }
}

export function LockedPropertyOntoMetadata(metadataKey: string) {
  return (target, propertyKey) => {
    const propertyLocker = propertyLockerOntoReflectedFactory(target)
    propertyLocker.lock(propertyKey, metadataKey)
  }
}

function propertyLockerOntoReflectedFactory(target: Type<SourceEvent>) {
  return {
    lock: (propertyKey: string, metadataKey: string) => {

      const descriptor = {
        get: function () {
          return Reflect.getMetadata(metadataKey, this.constructor)
        },
        set: function () {
          throw Error('Event version cannot be updated.')
        },
        enumerable: true
      }
      Object.defineProperty(target, propertyKey, descriptor)
    }
  }
}

export const VersionDecorator = LockedPropertyOntoMetadata(EventDecoratedKeys.Version);
export const TypeDecorator = LockedPropertyOntoMetadata(EventDecoratedKeys.Type);


