import {EventArtisan} from "./event.artisan";
import {SourceEvent} from "./source-event.class";
import {EmptyObject, StoredEvent} from "./event.types";

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
      const raw: { data: MyFirstTestEventData, meta: EmptyObject} = {
        data: { word: 'Hello' },
        meta: {}
      }
      event.fromRawData(raw.data, raw.meta)
      expect(event.serialize()).toEqual(expect.objectContaining({data: raw.data, meta: raw.meta}))
    })
  });
  describe('when crafting events with legacy versions', () => {
    describe('when crafting a legacy event', () => {
      it('should craft an event with accessible upcast method', () => {
        expect.anything()
      })
      it('should upcast the event and get its latest version', () => {
        expect.anything()
      })
    });
  });
});

/*
* Test Assets
* */

interface MyFirstTestEventData {
  word: string
}

@EventArtisan.Event({
  type: 'MyFirstTestEvent',
  version: 1
})
class MyFirstTestEvent extends SourceEvent<MyFirstTestEventData> {
}
