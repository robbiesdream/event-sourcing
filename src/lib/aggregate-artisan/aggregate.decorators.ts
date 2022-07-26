import {Type} from "@doesrobbiedream/ts-utils";
import {AggregateRoot} from "./aggregate-root.class";
import {SourceEvent} from "../event-artisan/source-event.class";
import {EventDecoratedKeys} from "../event-artisan/event.decorators";
import {StoredEvent} from "../event-artisan/event.types";

export enum AggregateDecoratedKeys {
  DeclaredEventHandlers = 'DeclaredEventHandlers'
}

export const EventHandlerDecorator = (event: Type<SourceEvent> | Array<Type<SourceEvent>>) => {
  const events: Array<Type<SourceEvent>> = Array.isArray(event) ? event : [event]
  return (target: AggregateRoot, propertyKey: string, descriptor: PropertyDescriptor) => {

    const eventsDictionary = events.reduce((dictionary, constructor: Type<SourceEvent>) => {
      const type = Reflect.getMetadata(EventDecoratedKeys.Type, constructor)
      const version = Reflect.getMetadata(EventDecoratedKeys.Version, constructor)
      const identifier = `${type}@${version}`
      return {
        ...dictionary, [identifier]: {
          identifier,
          constructor
        }
      }
    }, {})


    const registeredHandlers = Reflect.getMetadata(AggregateDecoratedKeys.DeclaredEventHandlers, target.constructor) || {}
    Object.keys(eventsDictionary).forEach(identifier => registeredHandlers[identifier] = propertyKey)
    Reflect.defineMetadata(AggregateDecoratedKeys.DeclaredEventHandlers, registeredHandlers, target.constructor)

    const originalProcessor: (data: StoredEvent) => void = descriptor.value
    const injectedProcessor = function (data: StoredEvent) {
      // Lift the event up to its latest
      const identifier = `${data.type}@${data.version}`
      const event: SourceEvent = new eventsDictionary[identifier].constructor()
      event.fromStoredData(data)
      const finalEvent: SourceEvent = event.lift()
      const finalData: StoredEvent = finalEvent.serialize()

      originalProcessor.apply(this, [finalData])
    }
    Object.defineProperty(injectedProcessor, 'name', {value: propertyKey})
    return {
      value: injectedProcessor
    }
  }
}

