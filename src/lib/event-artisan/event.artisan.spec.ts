import {EventArtisan} from "./event.artisan";
import {SourceEvent} from "./source-event.class";
import {EmptyObject, StoredEvent, Upcaster} from "./event.types";
import {LiftingNonLegacyEventException} from "./exceptions/lifting-non-legacy-event.exception";

describe(EventArtisan.name, () => {

  describe('when crafting any event', () => {
    let event: SourceEvent<MyFirstTestEventData>
    beforeEach(() => {
      event = new MyFirstTestEvent()
    })
    it('should craft an event with an accessible readonly version property', () => {
      expect(event.version).toEqual(1)
    })
    it('should craft an event with an accessible readonly type property', () => {
      expect(event.type).toEqual('MyFirstTestEvent')
    })
    it('should load event from stored event', () => {
      const stored_event: StoredEvent<MyFirstTestEventData> = {
        id: 'abcd-1234',
        type: 'MyFirstTestEvent',
        version: 1,
        createdAt: new Date(Date.now()),
        updatedAt: new Date(Date.now()),
        data: {
          word: 'hello world'
        },
        meta: {}
      }
      event.fromStoredData<MyFirstTestEventData>(stored_event)
      expect(event.serialize()).toEqual(stored_event)
    })
    it('should load event from new raw data', () => {
      const raw: { data: MyFirstTestEventData, meta: EmptyObject } = {
        data: {word: 'Hello'},
        meta: {}
      }
      event.fromRawData(raw.data, raw.meta)
      expect(event.serialize()).toEqual(expect.objectContaining({data: raw.data, meta: raw.meta}))
    })
  });
  describe('when crafting events with legacy versions', () => {
    let event: SourceEvent<MyFirstTestEventData>
    beforeEach(() => {
      event = new MyFirstTestEvent()
    })
    describe('when crafting a legacy event', () => {
      it('should craft an event with accessible lift method', () => {
        expect(event).toHaveProperty('lift')
      })
      it('should upcast the event and get its latest version', () => {
        expect(event.lift()).toBeInstanceOf(MyFirstTestEventV2)
      })
    });
    describe('when instantiating a legacy event and lifting it to its latest version', () => {
      let latestEvent: MyFirstTestEventV2
      beforeEach(() => {
        event = new MyFirstTestEvent()
        event.fromRawData<MyFirstTestEventData>({word: 'Hello'}, {})
        latestEvent = event.lift()
      })
      it('should preserve values properly', () => {
        expect(latestEvent.data.position).toEqual(-1)
      })
    });
    describe('when trying to lift a non-legacy event', () => {
      let latestEvent: MyFirstTestEventV2
      beforeEach(() => {
        latestEvent = new MyFirstTestEventV2()
      })
      it('should throw an error when lifting', function () {
        expect(() => latestEvent.lift()).toThrowError(LiftingNonLegacyEventException)
      });
    })
  });
});

/*
* Test Assets
* */

interface MyFirstTestEventData {
  word: string
}

interface MyFirstTestEventV2Data extends MyFirstTestEventData {
  position: number
}

@EventArtisan.Event({
  type: 'MyFirstTestEvent',
  version: 2
})
class MyFirstTestEventV2 extends SourceEvent<MyFirstTestEventV2Data> implements Upcaster<MyFirstTestEvent> {
  upcast(event: MyFirstTestEvent) {
    this.fromRawData<MyFirstTestEventV2Data>({...event.data, position: -1}, event.meta)
    return this
  }
}

@EventArtisan.LegacyOf(MyFirstTestEventV2)
@EventArtisan.Event({
  type: 'MyFirstTestEvent',
  version: 1
})
class MyFirstTestEvent extends SourceEvent<MyFirstTestEventData> {
}
