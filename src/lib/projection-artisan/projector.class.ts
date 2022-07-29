import {Projection} from "./projection.class";
import {StoredEvent} from "../event-artisan/event.types";
import {
  asyncScheduler,
  BehaviorSubject,
  filter,
  from,
  map,
  merge,
  mergeMap,
  Observable,
  Subject,
  Subscription,
  tap
} from "rxjs";
import cloneDeep from 'lodash-es/cloneDeep'
import {ProjectionDecoratedKeys} from "./projection.decorators";
import {SourceEvent} from "../event-artisan/source-event.class";
import {Type} from "@doesrobbiedream/ts-utils";


export type ExtractProjectionType<P> = P extends Projection<infer T> ? T : never

interface AppliedToProjectionManifest<P extends Projection> {
  event: StoredEvent
  initial: ExtractProjectionType<P>[]
  result: ExtractProjectionType<P>[]
}

export abstract class Projector<P extends Projection> {
  private subscription: Subscription;
  private _stream: Observable<StoredEvent>
  private _streams$: BehaviorSubject<Set<Observable<StoredEvent>>> = new BehaviorSubject(new Set())
  private _eventPipelineDispatcher$: Subject<void> = new Subject()
  private eventsQueue: StoredEvent[] = []
  private projectionChangesHandler: Subject<AppliedToProjectionManifest<P>> = new Subject()
  private pipelineIsFree = true

  constructor() {
    this._streams$.subscribe((streamsSet) => this.stream = merge(...Array.from(streamsSet.values())))
    this._eventPipelineDispatcher$.pipe(
      filter(() => {
        return this.pipelineIsFree
      }),
      tap(() => {
        this.pipelineIsFree = false
      }),
      map(() => {
        return this.eventsQueue.shift()
      }),
      filter((event) => {
        return !!event
      }),
      mergeMap(event => from(this.processIncomingEvent(event))
        .pipe(
          map(({initial, result}) => ({event, initial, result}))
        )
      )
    ).subscribe((manifest) => this.projectionChangesHandler.next(manifest))
  }

  public attachStream(stream: Observable<StoredEvent>) {
    if (this.subscription) this.subscription.unsubscribe()
    this._streams$.next(this._streams$.getValue().add(stream))
  }

  get eventApplied(): Observable<AppliedToProjectionManifest<P>> {
    return this.projectionChangesHandler.asObservable()
  }

  private set stream(stream: Observable<StoredEvent>) {
    if (this.subscription) this.subscription.unsubscribe()
    this._stream = stream
    this.subscription = this._stream.subscribe((event) => {
      this.eventsQueue.push(event)
      this._eventPipelineDispatcher$.next()
    })
  }

  private async processIncomingEvent(event: StoredEvent): Promise<Pick<AppliedToProjectionManifest<P>, 'initial' | 'result'>> {
    const handlersSet: Map<string, { handler: string, eventClass: Type<SourceEvent> }> = Reflect.getMetadata(ProjectionDecoratedKeys.ProjectorFetchers, this)
    const ReflectedProjection: Type<Projection> = Reflect.getMetadata(ProjectionDecoratedKeys.ProjectionType, this.constructor)

    if (!handlersSet.has(`${event.type}@${event.version}`)) {
      throw Error(`Event ${event.type}@${event.version} has no fetchers to acquire current projections. Please, define a handler using @ProjectionFetcher decorator`)
    }
    const handlerKey = handlersSet.get(`${event.type}@${event.version}`).handler

    const projections: ExtractProjectionType<P>[] = await this[handlerKey](event)

    const resultProjections = cloneDeep(projections).map(projection => new ReflectedProjection(projection))
    const result = resultProjections.map((p: Projection) => p.apply(event).serialize())
    asyncScheduler.schedule(() => this.releasePipeline(), 0)
    return {initial: projections, result}
  }

  private releasePipeline() {
    this.pipelineIsFree = true
    this._eventPipelineDispatcher$.next()
  }
}
