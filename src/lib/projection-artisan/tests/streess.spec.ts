import {MockDB} from "./mocked-db";
import {StoredEvent} from "../../event-artisan/event.types";
import {createEventFromData} from "./utils";
import {
  SomeEventWithTonsOfData,
  SomeEventWithTonsOfDataData,
  SomeVersionedEventV1,
  SomeVersionedEventV1Data,
  SomeVersionedEventV2,
  SomeVersionedEventV2Data,
  TheAnyProjector
} from "./stress.spec.utils";


describe.skip('Stressing the system', () => {
  const ProjectionsDB = new MockDB()

  describe('when processing huge amounts of events', () => {
    jest.setTimeout(1000000)

    const stressRatio = 1000
    let projector: TheAnyProjector
    let events: StoredEvent[]

    beforeAll(() => {
      projector = new TheAnyProjector(ProjectionsDB)
      events = Array.from({length: stressRatio}).reduce<StoredEvent[]>((results, _, index) => {
        const tonsOfData: SomeEventWithTonsOfDataData = {
          some: String(index + 1),
          of: String(index + 1),
          my: String(index + 1),
          trousers: String(index + 1),
          dont: String(index + 1),
          have: String(index + 1),
          the: String(index + 1),
          proper: String(index + 1),
          size: String(index + 1),
        }
        const versionDataV1: SomeVersionedEventV1Data = {
          iAmAnOldProperty: 'Hello'
        }
        const versionDataV2: SomeVersionedEventV2Data = {
          iAmTheNewProperty: 'World!'
        }
        const events = [
          createEventFromData<SomeEventWithTonsOfData>('SomeEventWithTonsOfData', 1, tonsOfData),
          createEventFromData<SomeEventWithTonsOfData>('SomeEventWithTonsOfData', 1, tonsOfData),
          createEventFromData<SomeEventWithTonsOfData>('SomeEventWithTonsOfData', 1, tonsOfData),
          createEventFromData<SomeEventWithTonsOfData>('SomeEventWithTonsOfData', 1, tonsOfData),
          createEventFromData<SomeEventWithTonsOfData>('SomeEventWithTonsOfData', 1, tonsOfData),
          createEventFromData<SomeVersionedEventV1>('SomeVersionedEvent', 1, versionDataV1),
          createEventFromData<SomeVersionedEventV1>('SomeVersionedEvent', 1, versionDataV1),
          createEventFromData<SomeVersionedEventV1>('SomeVersionedEvent', 1, versionDataV1),
          createEventFromData<SomeVersionedEventV2>('SomeVersionedEvent', 2, versionDataV2),
          createEventFromData<SomeVersionedEventV2>('SomeVersionedEvent', 2, versionDataV2)
        ]

        return [...results, ...events]
      }, [])
    })
    it('should process in an acceptable time period', (done) => {
      projector.process(events).onFinished.subscribe(async () => {
        const results = await ProjectionsDB.get()
        expect(results).toHaveLength(stressRatio * 10)
        done()
      })
    })
  })

})
