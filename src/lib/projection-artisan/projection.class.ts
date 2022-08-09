import {StoredEvent} from "../event-artisan/event.types";
import {EventType, ProjectionDecoratedKeys, ProjectorEventHandlerManifest} from "./projection.decorators";

export class Projection<T = unknown> {
  constructor(projection: T) {
    this.load(projection)
  }

  async apply(event: StoredEvent): Promise<Projection<T>> {
    const handlers: Map<EventType, ProjectorEventHandlerManifest> = Reflect.getMetadata(ProjectionDecoratedKeys.ProjectionEventHandlers, this)
    const selector = `${event.type}@${event.version}`
    const handlerKey = handlers.get(selector).handlerKey

    await this[handlerKey](event)
    return this
  }

  public serialize(): T {
    return Object.keys(this).reduce((result, key) => ({...result, [key]: this[key]}), {}) as T
  }

  protected load(projection: T) {
    Object.assign(this, projection)
  }
}
