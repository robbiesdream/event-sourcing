import {SourceEvent} from "../event-artisan/source-event.class";
import {AggregateArtisan} from "./aggregate.artisan";
import {StoredEvent, Upcaster} from "../event-artisan/event.types";
import {EventArtisan} from "@doesrobbiedream/event-sourcing";
import {AggregateRoot} from "./aggregate-root.class";

describe('', function () {
  describe('when crafting an aggregate', function () {
    let aggregate: MyAggregate
    let events: Array<StoredEvent<unknown, unknown>>
    beforeEach(() => {
      aggregate = new MyAggregate()
      events = [
        createEventFromData<EventV1>('MyTestEvent', 1, {word: 'Hello'}, {}),
        createEventFromData<EventV1>('MyTestEvent', 1, {word: 'from Spain!'}, {}),
        createEventFromData<EventV2>('MyTestEvent', 2, {word: 'World', position: 1}, {})
      ]
    })
    describe('and crafting an event handler', function () {
      it('should maintain method names', () => {
        expect(aggregate).toHaveProperty('myEventHandler')
      })
      it('should inject lifting behaviour on event handlers', () => {
        const handlersSpy = jest.spyOn(aggregate, 'myEventHandler')
        aggregate.updateStateFromEvents([events[0]])

        const assertedEvent = events[0]
        assertedEvent.data['position'] = -1

        expect(handlersSpy).toHaveBeenCalledWith(assertedEvent)
      })
    });
    describe('and getting aggregate values', function () {
      it('should return the proper state after processing events', () => {
        aggregate.updateStateFromEvents(events)
        expect(aggregate.sentence).toEqual('Hello World from Spain!')
      })
    });
    describe('and it has invalid handlers', function () {
      it('should throw an error when different event types are provided', function () {
        const decoratorExecutor = () => AggregateArtisan.EventHandler([EventV1, EventV2, NonLegacyEvent])
        const expectedMessage = 'An event handler can only process one event type. Types: [MyTestEvent, NonLegacyEvent] were provided.'
        expect(decoratorExecutor).toThrow(expectedMessage)
      })
      it('should throw an error when more than one non-legacy event is provided', function () {
        const decoratorExecutor = () => AggregateArtisan.EventHandler([EventV1, EventV2, EventV3])
        const expectedMessage = 'An event handler should only have one non-legacy event. The following [EventV2, EventV3] are non-legacy.'
        expect(decoratorExecutor).toThrow(expectedMessage)
      })
    });
  });

});

interface EventV1Data {
  word: string
}

interface EventV2Data extends EventV1Data {
  position: number
}

@EventArtisan.Event({
  type: 'NonLegacyEvent',
  version: 1
})
class NonLegacyEvent extends SourceEvent {
}

@EventArtisan.Event({type: 'MyTestEvent', version: 3})
class EventV3 extends SourceEvent<EventV2Data> implements Upcaster<EventV1, EventV2> {
  upcast(event: EventV1): EventV2 {
    const eventData: EventV2Data = {word: event.data.word, position: -1}
    this.fromRawData(eventData, {})
    return this
  }
}

@EventArtisan.Event({type: 'MyTestEvent', version: 2})
class EventV2 extends SourceEvent<EventV2Data> implements Upcaster<EventV1, EventV2> {
  upcast(event: EventV1): EventV2 {
    const eventData: EventV2Data = {word: event.data.word, position: -1}
    this.fromRawData(eventData, {})
    return this
  }
}


@EventArtisan.LegacyOf(EventV2)
@EventArtisan.Event({type: 'MyTestEvent', version: 1})
class EventV1 extends SourceEvent<EventV1Data> {
}

class MyAggregate extends AggregateRoot {
  wordsArray: string[] = []

  get sentence(): string {
    return this.wordsArray.join(' ')
  }

  @AggregateArtisan.EventHandler([EventV1, EventV2])
  myEventHandler(event: StoredEvent<EventV2Data>): void {
    const word = event.data.word
    const position = event.data.position === -1 ? this.wordsArray.length : event.data.position
    this.wordsArray.splice(position, 0, word)
  }
}

type extractDataTypeFromEvent<Type extends SourceEvent> = Type extends SourceEvent<infer Data, infer _> ? Data : never
type extractMetaTypeFromEvent<Type extends SourceEvent> = Type extends SourceEvent<infer _, infer Meta> ? Meta : never
type StorableFromEvent<Type extends SourceEvent> = StoredEvent<extractDataTypeFromEvent<Type>, extractMetaTypeFromEvent<Type>>

const createEventFromData = <T extends SourceEvent>(type: string, version: number, data: extractDataTypeFromEvent<T>, meta: extractMetaTypeFromEvent<T>): StorableFromEvent<T> => {
  return {
    id: 'abdc-1234',
    data,
    meta,
    createdAt: new Date(Date.now()),
    updatedAt: new Date(Date.now()),
    type, version
  }
}
