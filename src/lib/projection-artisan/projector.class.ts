import {Projection} from "./projection.class";
import {StoredEvent} from "../event-artisan/event.types";
import {filter, Observable, Subject, take, tap} from "rxjs";
import cloneDeep from 'lodash-es/cloneDeep'
import {
  ProjectionDecoratedKeys,
  ProjectorEventHandlerManifest,
  ProjectorHandlerManifest
} from "./projection.decorators";
import {Type} from "@doesrobbiedream/ts-utils";
import {SourceEvent} from "../event-artisan/source-event.class";
import {Queue} from "queue-typescript";


export type ExtractProjectionType<P> = P extends Projection<infer T> ? T : never

interface EventApplicationManifest<P extends Projection> {
  event: StoredEvent
  initial: ExtractProjectionType<P>[]
  projected: ExtractProjectionType<P>[]
}

export class EventsQueueFinisher extends Subject<void> {

}

export abstract class Projector<P extends Projection> {

  protected _appliedEvent$: Subject<EventApplicationManifest<P>> = new Subject()
  protected _stream$: Subject<StoredEvent> = new Subject()
  protected _tick$: Subject<void> = new Subject<void>()

  protected processing = false

  protected activeQueue: Queue<StoredEvent | EventsQueueFinisher>
  protected queues: Queue<Queue<StoredEvent | EventsQueueFinisher>> = new Queue<Queue<StoredEvent | EventsQueueFinisher>>()

  private readonly eventAppliersManifests: Map<string, ProjectorEventHandlerManifest>
  private readonly afterEventManifests: Map<string, ProjectorEventHandlerManifest>
  private readonly afterEachManifest: ProjectorHandlerManifest
  private readonly projectionClass: Type<Projection>

  constructor() {
    // Reflected Data
    this.eventAppliersManifests = Reflect.getMetadata(ProjectionDecoratedKeys.ProjectorFetchers, this) || new Map()
    this.afterEventManifests = Reflect.getMetadata(ProjectionDecoratedKeys.ProjectionAfterEventCallback, this) || new Map()
    this.afterEachManifest = Reflect.getMetadata(ProjectionDecoratedKeys.ProjectionAfterEachEventCallback, this)
    this.projectionClass = Reflect.getMetadata(ProjectionDecoratedKeys.ProjectionType, this.constructor)
    this.connectEventsStream()
  }

  public attachStream(stream: Observable<StoredEvent>){
    const afterEach = new Subject<StoredEvent>()
    stream.subscribe((event) => {
      const finisher = new EventsQueueFinisher()
      this.queues.enqueue(new Queue<StoredEvent | EventsQueueFinisher>(event, finisher))
      finisher.subscribe({complete: () => afterEach.next(event)})
      this._tick$.next()
    })
    return {
      afterEach: afterEach.pipe(take(1))
    }
  }

  public process(events: Array<StoredEvent>) {
    const finisher = new EventsQueueFinisher()
    this.queues.enqueue(new Queue<StoredEvent | EventsQueueFinisher>(...events, finisher))
    this._tick$.next()
    return {
      onFinished: finisher.pipe(take(1))
    }
  }

  private connectEventsStream() {
    this._stream$
      .pipe(
        tap(() => this.processing = true)
      )
      .subscribe(async (event) => {
        const initial = await this.fetchCurrentState(event)
        const projected = await this.applyEvent(event, initial);
        await this.applyAfterEvent(event, projected)
        await this.applyAfterEach(projected)
        this._appliedEvent$.next({initial, projected, event})
        this.processing = false
        this._tick$.next()
      })

    this._tick$.pipe(filter(() => !this.processing)).subscribe(() => this.next())
  }

  private next() {
    if (!this.activeQueue || this.activeQueue.length === 0) {
      this.nextQueue()
      return
    }
    if (this.activeQueue.front instanceof EventsQueueFinisher) {
      const finisher: EventsQueueFinisher = this.activeQueue.dequeue() as EventsQueueFinisher
      finisher.next()
      finisher.complete()
      return
    }
    const nextEvent: StoredEvent = this.activeQueue.dequeue() as StoredEvent
    this._stream$.next(nextEvent)
  }

  private nextQueue() {
    if (this.queues.length) {
      this.activeQueue = this.queues.dequeue()
      this._tick$.next()
    }
  }

  private async fetchCurrentState(event: StoredEvent) {
    const eventIndex = SourceEvent.getIndexFromStored(event)
    if (!this.eventAppliersManifests.has(eventIndex)) {
      throw Error(`Event ${event.type}@${event.version} has no fetchers to acquire current projections. Please, define a handler using @ProjectionFetcher decorator`)
    }
    const {handlerKey: eventApplierKey} = this.eventAppliersManifests.get(eventIndex)
    return await this[eventApplierKey](event)
  }

  private async applyEvent(event: StoredEvent, initial: Array<ExtractProjectionType<P>>) {
    const projections = cloneDeep(initial).map(projection => new this.projectionClass(projection))
    const resultsMapper: (p: Projection) => Promise<unknown> = (p) => p.apply(event).then(projection => projection.serialize())
    return await Promise.all(projections.map(resultsMapper))
  }

  private async applyAfterEvent(event: StoredEvent, projections: Array<ExtractProjectionType<P>>) {
    const eventIndex = SourceEvent.getIndexFromStored(event)
    if (this.afterEventManifests.has(eventIndex)) {
      const {handlerKey: afterEventHandler} = this.afterEventManifests.get(eventIndex)
      await this[afterEventHandler](projections)
    }
  }

  private async applyAfterEach(projections: Array<ExtractProjectionType<P>>) {
    if (this.afterEachManifest) {
      const {handlerKey: afterEachEventHandler} = this.afterEachManifest
      await this[afterEachEventHandler](projections)
    }
  }


}
