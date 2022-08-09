import {SourceEvent} from "../event-artisan/source-event.class";
import {Type} from "@doesrobbiedream/ts-utils";
import {Projection} from "./projection.class";
import {EventDecoratedKeys} from "../event-artisan/event.decorators";
import {StoredEvent} from "../event-artisan/event.types";
import {ExtractProjectionType, Projector} from "./projector.class";

export enum ProjectionDecoratedKeys {
  ProjectionType = 'ProjectionType',
  ProjectorFetchers = 'ProjectorFetchers',
  ProjectionEventHandlers = 'ProjectionEventHandlers',
  ProjectionAfterEventCallback = 'ProjectionAfterEventCallback',
  ProjectionAfterEachEventCallback = 'ProjectionAfterEachEventCallback'
}

export type ProjectionFetcher<P extends Projection> = (event: StoredEvent) => Promise<ExtractProjectionType<P>[]>
export type EventProjectorMethod<Event extends SourceEvent> = (event: Event) => Promise<void>
export type EventProjectorCallback<T = unknown> = (projections: Array<T>) => Promise<void>
export type EventType = string
export type MethodKey = string
export interface ProjectorHandlerManifest {
  handlerKey: string
}
export interface ProjectorEventHandlerManifest extends ProjectorHandlerManifest{
  Event: Type<SourceEvent>
}
// Decorators
export function ProjectionAcquirerDecorator<P extends Projection>(events: Array<Type<SourceEvent>>) {
  return (target: Projector<P>, propertyKey: MethodKey, _: TypedPropertyDescriptor<ProjectionFetcher<P>>) => {
    const handlers: Map<EventType, ProjectorEventHandlerManifest> = Reflect.getMetadata(ProjectionDecoratedKeys.ProjectorFetchers, target) || new Map()

    events.forEach(event => {
      const type = Reflect.getMetadata(EventDecoratedKeys.Type, event)
      const version = Reflect.getMetadata(EventDecoratedKeys.Version, event)
      handlers.set(`${type}@${version}`, {handlerKey: propertyKey, Event: event})
    })

    Reflect.defineMetadata(ProjectionDecoratedKeys.ProjectorFetchers, handlers, target)
  }
}

export function EventApplierDecorator(event: Type<SourceEvent> | Array<Type<SourceEvent>>) {
  const events: Array<Type<SourceEvent>> = Array.isArray(event) ? event : [event];
  return (target: Projection, methodName: MethodKey, descriptor: TypedPropertyDescriptor<EventProjectorMethod<SourceEvent>>) => {
    const handlers: Map<EventType, ProjectorEventHandlerManifest> = Reflect.getMetadata(ProjectionDecoratedKeys.ProjectionEventHandlers, target) || new Map()

    events.forEach(event => {
      handlers.set(SourceEvent.getIndex(event), {handlerKey: methodName, Event: event})
    })

    Reflect.defineMetadata(ProjectionDecoratedKeys.ProjectionEventHandlers, handlers, target)
    const originalHandler = descriptor.value
    const newHandler = eventApplierHandlerBuilder(originalHandler)

    Object.defineProperty(newHandler, 'name', {value: methodName})

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

export function AfterEachOfType<P extends Projection>(event: Type<SourceEvent> | Array<Type<SourceEvent>>){
  const events: Array<Type<SourceEvent>> = Array.isArray(event) ? event : [event];
  return (target: Projector<Projection>, methodName: MethodKey, descriptor: TypedPropertyDescriptor<EventProjectorCallback<ExtractProjectionType<P>>>) => {
    const handlers: Map<EventType, ProjectorEventHandlerManifest> = Reflect.getMetadata(ProjectionDecoratedKeys.ProjectionAfterEventCallback, target) || new Map()
    events.forEach(event => {
      handlers.set(SourceEvent.getIndex(event), {handlerKey: methodName, Event: event})
    })
    Reflect.defineMetadata(ProjectionDecoratedKeys.ProjectionAfterEventCallback, handlers, target)
  }
}

export function AfterEach(){
  return (target: Projector<Projection>, methodName: MethodKey, descriptor: TypedPropertyDescriptor<EventProjectorCallback>) => {
    Reflect.defineMetadata(ProjectionDecoratedKeys.ProjectionAfterEachEventCallback, {handlerKey: methodName}, target)
  }
}

// Helpers
export const eventApplierHandlerBuilder = (original: EventProjectorMethod<SourceEvent>) => async function eventApplierHandler(event: StoredEvent){
  const handlers: Map<EventType, ProjectorEventHandlerManifest> = Reflect.getMetadata(ProjectionDecoratedKeys.ProjectionEventHandlers, this) || new Map()
  const identifier = SourceEvent.getIndexFromStored(event)
  const EventConstructor = handlers.get(identifier).Event
  const eventInstance = new EventConstructor()
  eventInstance.fromStoredData(event)
  const liftedEventInstance: SourceEvent = eventInstance.lift()
  await original.apply(this, [liftedEventInstance.serialize()])
}
