import {StoredEvent} from "../event-artisan/event.types";
import {EventType, ProjectionDecoratedKeys, ProjectorHandlersManifest} from "./projection.decorators";

export class Projection<T = unknown> {
  constructor(projection: T) {
    this.load(projection)
  }
  apply(event: StoredEvent) {
    const handlers: Map<EventType, ProjectorHandlersManifest> = Reflect.getMetadata(ProjectionDecoratedKeys.ProjectionEventHandlers, this)
    const handlerKey = handlers.get(`${event.type}@${event.version}`).handler

    this[handlerKey](event)
  }

  protected load(projection: T) {
    Object.assign(this, projection)
  }
}
