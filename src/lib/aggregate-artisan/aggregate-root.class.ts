import {StoredEvent} from "../event-artisan/event.types";
import {AggregateDecoratedKeys} from "./aggregate.decorators";

export class AggregateRoot {
  public updateStateFromEvents(events: StoredEvent<unknown, unknown>[]): void {
    events.forEach((e) => {
      const handlersDictionary = Reflect.getMetadata(AggregateDecoratedKeys.DeclaredEventHandlers, this.constructor)
      const handler = handlersDictionary[`${e.type}@${e.version}`]
      this[handler](e)
    })
  }
}
