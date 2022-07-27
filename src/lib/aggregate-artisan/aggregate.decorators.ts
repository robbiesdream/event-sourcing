import {Type} from "@doesrobbiedream/ts-utils";
import {AggregateRoot} from "./aggregate-root.class";
import {SourceEvent} from "../event-artisan/source-event.class";
import {EventDecoratedKeys} from "../event-artisan/event.decorators";
import {StoredEvent} from "../event-artisan/event.types";
import {LegacyEvent} from "../event-artisan/mixins/legacy-event.mixin";
import uniq from 'lodash-es/uniq'

interface EventsDictionaryItem {
  identifier: string
  TypeClass: Type<SourceEvent>
}

export enum AggregateDecoratedKeys {
  DeclaredEventHandlers = 'DeclaredEventHandlers'
}

export const EventHandlerDecorator = (event: Type<SourceEvent> | Array<Type<SourceEvent>>) => {
  const events: Array<Type<SourceEvent>> = Array.isArray(event) ? event : [event]

  const processableEventsValidationStatus = validateProcessableEvents(events)
  if (!processableEventsValidationStatus.valid) {
    throw Error(processableEventsValidationStatus.message)
  }

  return (target: AggregateRoot, propertyKey: string, descriptor: PropertyDescriptor) => {

    const eventsDictionary: Record<string, EventsDictionaryItem> = events.reduce((dictionary, TypeClass: Type<SourceEvent>) => {
      const type = Reflect.getMetadata(EventDecoratedKeys.Type, TypeClass)
      const version = Reflect.getMetadata(EventDecoratedKeys.Version, TypeClass)
      const identifier = `${type}@${version}`
      return {
        ...dictionary, [identifier]: {
          identifier,
          TypeClass
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
      const event: SourceEvent = new eventsDictionary[identifier].TypeClass()
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

function validateProcessableEvents(events: Array<Type<SourceEvent>>): { valid: boolean; message?: string } {
  // Should all be of the same type
  const types: string[] = uniq(events.map(eventType => Reflect.getMetadata(EventDecoratedKeys.Type, eventType)))
  if (types.length !== 1) {
    return {
      valid: false,
      message: `An event handler can only process one event type. Types: [${types.join(', ')}] were provided.`
    }
  }
  // Should only have ONE non-legacy event
  const nonLegacyEvents = events.filter(eventType => !LegacyEvent.isLegacy(eventType))
  if (nonLegacyEvents.length !== 1) {
    return {
      valid: false,
      message: `An event handler should only have one non-legacy event. The following [${nonLegacyEvents.map(c => c.name).join(', ')}] are non-legacy.`
    };
  }
  return {valid: true}
}

