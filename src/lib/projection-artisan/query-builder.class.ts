import {StoredEvent} from "../event-artisan/event.types";

export abstract class QueryBuilder<Query = unknown> {
  abstract build(event: StoredEvent): Query
}
