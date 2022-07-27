import {StoredEvent} from "../event-artisan/event.types";
import {AggregateDecoratedKeys} from "./aggregate.decorators";

export class AggregateRoot {

  public updateStateFromEvents(events: StoredEvent | StoredEvent[]): void {
    events = Array.isArray(events) ? events : [events]
    events.forEach((e) => this.applyEvent(e))
  }

  private applyEvent(event: StoredEvent): void{
    const handlersDictionary = Reflect.getMetadata(AggregateDecoratedKeys.DeclaredEventHandlers, this.constructor)
    const handler = handlersDictionary[`${event.type}@${event.version}`]
    this[handler](event)
  }

}
