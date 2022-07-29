import {Projection} from "./projection.class";
import {StoredEvent} from "../event-artisan/event.types";
import {BehaviorSubject, from, map, merge, mergeMap, Observable, Subject, Subscription, tap} from "rxjs";
import cloneDeep from 'lodash-es/cloneDeep'
import {ProjectionDecoratedKeys} from "./projection.decorators";
import {SourceEvent} from "../event-artisan/source-event.class";
import {Type} from "@doesrobbiedream/ts-utils";

interface AppliedToProjectionManifest<P extends Projection> {
  event: StoredEvent
  initial: P[]
  result: P[]
}

export abstract class Projector<P extends Projection> {
  protected subscription: Subscription;
  protected _stream: Observable<StoredEvent>
  protected _streams$: BehaviorSubject<Set<Observable<StoredEvent>>> = new BehaviorSubject(new Set())
  protected projectionChangesHandler: Subject<AppliedToProjectionManifest<P>> = new Subject()

  constructor() {
    this._streams$.subscribe((streamsSet) => this.stream = merge(...Array.from(streamsSet.values())))
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
    this.subscription = this._stream
      .pipe(
        mergeMap(event => from(this.processIncomingEvent(event))
          .pipe(
            map(({initial, result}) => ({event, initial, result})))),
        tap((results) => console.log(results))
      ).subscribe((manifest) => this.projectionChangesHandler.next(manifest))
  }

  private async processIncomingEvent(event: StoredEvent): Promise<Pick<AppliedToProjectionManifest<P>, 'initial' | 'result'>> {
    const handlersSet: Map<string, { handler: string, eventClass: Type<SourceEvent> }> = Reflect.getMetadata(ProjectionDecoratedKeys.ProjectorFetchers, this)

    if (!handlersSet.has(`${event.type}@${event.version}`)) {
      throw Error(`Event ${event.type}@${event.version} has no fetchers to acquire current projections. Please, define a handler using @ProjectionFetcher decorator`)
    }
    const handlerKey = handlersSet.get(`${event.type}@${event.version}`).handler

    const projections: P[] = await this[handlerKey](event)
    const result = cloneDeep(projections)
    result.forEach(p => p.apply(event))
    return {initial: projections, result}
  }
}
