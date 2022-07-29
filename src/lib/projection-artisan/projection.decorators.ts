import {SourceEvent} from "../event-artisan/source-event.class";
import {Type} from "@doesrobbiedream/ts-utils";
import {Projection} from "./projection.class";
import {EventDecoratedKeys} from "../event-artisan/event.decorators";
import {StoredEvent} from "../event-artisan/event.types";
import {ExtractProjectionType, Projector} from "./projector.class";

export enum ProjectionDecoratedKeys {
  ProjectionType = 'ProjectionType',
  ProjectorFetchers = 'ProjectorFetchers',
  ProjectionEventHandlers = 'ProjectionEventHandlers'
}

type ProjectionFetcher<P extends Projection> = (event: StoredEvent) => Promise<ExtractProjectionType<P>[]>
type EventProjectorMethod = (event) => void
export type EventType = string
export type MethodKey = string

export interface ProjectorHandlersManifest {
  handler: string
  Event: Type<SourceEvent>
}

export function ProjectionAcquirerDecorator<P extends Projection>(events: Array<Type<SourceEvent>>) {
  return (target: Projector<P>, propertyKey: MethodKey, _: TypedPropertyDescriptor<ProjectionFetcher<P>>) => {
    const handlers: Map<EventType, ProjectorHandlersManifest> = Reflect.getMetadata(ProjectionDecoratedKeys.ProjectorFetchers, target.constructor) || new Map()

    events.forEach(event => {
      const type = Reflect.getMetadata(EventDecoratedKeys.Type, event)
      const version = Reflect.getMetadata(EventDecoratedKeys.Version, event)
      handlers.set(`${type}@${version}`, {handler: propertyKey, Event: event})
    })

    Reflect.defineMetadata(ProjectionDecoratedKeys.ProjectorFetchers, handlers, target)
  }
}

export function EventApplierDecorator<T extends SourceEvent>(events: Array<Type<T>>) {
  return (target: Projection, propertyKey: MethodKey, descriptor: TypedPropertyDescriptor<EventProjectorMethod>) => {
    const handlers: Map<EventType, ProjectorHandlersManifest> = Reflect.getMetadata(ProjectionDecoratedKeys.ProjectionEventHandlers, target) || new Map()

    events.forEach(event => {
      const type = Reflect.getMetadata(EventDecoratedKeys.Type, event)
      const version = Reflect.getMetadata(EventDecoratedKeys.Version, event)
      handlers.set(`${type}@${version}`, {handler: propertyKey, Event: event})
    })

    Reflect.defineMetadata(ProjectionDecoratedKeys.ProjectionEventHandlers, handlers, target)
    const originalHandler = descriptor.value
    const newHandler = function (event: StoredEvent) {
      const identifier = `${event.type}@${event.version}`
      const instance = new (handlers.get(identifier)).Event()
      instance.fromStoredData(event)
      const liftedEvent = instance.lift()
      originalHandler.apply(this, [liftedEvent])
    }

    Object.defineProperty(newHandler, 'name', {value: propertyKey})

    return {
      value: newHandler
    }
  }
}

export function ProjectorDecorator<P extends Projection>(projection: Type<P>) {
  return (target: Type<Projector<P>>) => {
    Reflect.defineMetadata(ProjectionDecoratedKeys.ProjectionType, projection, target)
  }
}
