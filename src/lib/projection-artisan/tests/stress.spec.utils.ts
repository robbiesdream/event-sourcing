import {EventArtisan} from "../../event-artisan/event.artisan";
import {SourceEvent} from "../../event-artisan/source-event.class";
import {StoredEvent, Upcaster} from "../../event-artisan/event.types";
import {Projection} from "../projection.class";
import {ProjectionArtisan} from "../projection.artisan";
import {Projector} from "../projector.class";
import {MockDB} from "./mocked-db";


/* EVENTS *****************************************************************/
export interface SomeEventWithTonsOfDataData {
  some: string
  of: string
  my: string
  trousers: string
  dont: string
  have: string
  the: string
  proper: string
  size: string
}

export interface SomeVersionedEventV1Data {
  iAmAnOldProperty: string
}

export interface SomeVersionedEventV2Data {
  iAmTheNewProperty: string
}

@EventArtisan.Event({
  type: 'SomeEventWithTonsOfData',
  version: 1
})
export class SomeEventWithTonsOfData extends SourceEvent<SomeEventWithTonsOfDataData> {
}

@EventArtisan.Event({
  type: 'SomeVersionedEvent',
  version: 2
})
export class SomeVersionedEventV2 extends SourceEvent<SomeVersionedEventV2Data> implements Upcaster<SomeVersionedEventV1> {
  upcast(event: SomeVersionedEventV1) {
    const data: SomeVersionedEventV2Data = {iAmTheNewProperty: event.data.iAmAnOldProperty}
    this.fromStoredData({...event, data})
  }
}

@EventArtisan.LegacyOf(SomeVersionedEventV2)
@EventArtisan.Event({
  type: 'SomeVersionedEvent',
  version: 1
})
export class SomeVersionedEventV1 extends SourceEvent<SomeVersionedEventV1Data> {
}

/* PROJECTIONS ***************************************************************/

export class TheAnyProjection extends Projection {
  id: string

  @ProjectionArtisan.EventApplier([SomeVersionedEventV1, SomeVersionedEventV2, SomeEventWithTonsOfData])
  async anyEventApplier(event: StoredEvent) {
    this.id = event.id
  }
}

@ProjectionArtisan.Projector(TheAnyProjection)
export class TheAnyProjector extends Projector<TheAnyProjection> {
  protected processed = 0
  constructor(protected db: MockDB) {
    super();
  }
  @ProjectionArtisan.AfterEach()
  async save(projection: TheAnyProjection[]) {
    if(this.processed % 10 === 0){
      console.log(this.processed)
    }
    await this.db.saveAll(projection)
    this.processed++
  }

  @ProjectionArtisan.ProjectionAcquirer([SomeVersionedEventV1, SomeVersionedEventV2, SomeEventWithTonsOfData])
  async noopFetcher() {
    return new Promise<[Record<string, never>]>(resolve => {
      setTimeout(
        () => {
          resolve([{}])
        },
        Math.floor(Math.random() * 100)
      )
    })
  }
}
