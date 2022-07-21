import {EventCraftingManifest} from "./event.types";
import {SourceEvent} from "./source-event.class";
import {Type} from "@doesrobbiedream/ts-utils";

export enum EventDecoratedKeys {
  Type = 'Type',
  Version = 'Version'
}

export function EventDecoratorFactory(manifest: EventCraftingManifest){
  return function (target: Type<SourceEvent<unknown, unknown>>){
    Reflect.defineMetadata(EventDecoratedKeys.Type, manifest.type, target)
    Reflect.defineMetadata(EventDecoratedKeys.Version, manifest.version, target)
  }
}

export function LockedPropertyOntoMetadata(metadataKey: string){
  return (target, propertyKey) => {
    const propertyLocker = propertyLockerOntoReflectedFactory(target)
    propertyLocker.lock(propertyKey, metadataKey)
  }
}
function propertyLockerOntoReflectedFactory(target: Type<SourceEvent>) {
  return {
    lock: (propertyKey: string, metadataKey: string) => {

      const descriptor = {
        get: function(){
          return Reflect.getMetadata(metadataKey, this.constructor)
        },
        set: function (){
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


