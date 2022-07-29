import {ProjectionArtisan} from "./projection.artisan";
import {Observable, skip, Subject} from "rxjs";
import {StoredEvent} from "../event-artisan/event.types";
import {Projector} from "./projector.class";
import {Projection} from "./projection.class";
import uniq from 'lodash-es/uniq'
import {SourceEvent} from "../event-artisan/source-event.class";
import {EventArtisan} from "@doesrobbiedream/event-sourcing";

describe(ProjectionArtisan.name, function () {

  /*
  *
  * Feature: Update a projected collection from events [updated-a-projected-collection.feature]
  *   Scenario:  Update the name of an author
  *
  *   Solution Overview
  *   The Projector will be dependent on a ResultsProvider and a Concrete Projection, which is basically a query executor connected to an external DB
  *   It will also link streams of an EventType to a Query that will execute to fetch implicated results
  *   whenever a stream fires with an event.
  *   When the results are fetched, the Projector will generate instances of its Projection and apply the given event to it.
  *
  * */

  describe('Update the name of an author', () => {
    describe('given a persisted ProjectedCollection of Book<{ title: string, author: string }>', function () {
      let eventsStreamHandler: Subject<StoredEvent>
      let eventsStream: Observable<StoredEvent>
      let projector: Projector<BookProjection>

      beforeEach(() => {
        eventsStreamHandler = new Subject()
        eventsStream = eventsStreamHandler.asObservable()
        projector = new BooksProjector()
      })

      describe('when the event AuthorsNameUpdated is fired', function () {
        let authorNameUpdatedEvent: AuthorNameUpdatedStored
        beforeEach(() => {
          authorNameUpdatedEvent = createEventFromData<AuthorNameUpdatedStored>('AuthorNameUpdated', 1, {
            previousName: 'Tolkien, J. R R.',
            newName: 'Tolkien, J. R. R.'
          })
          projector.attachStream(eventsStream)
        })
        it('should update all the books that previously had that author\'s name', function (done) {
          projector.eventApplied.subscribe(manifest => {
            expect(uniq(manifest.result.map(b => b.author))[0]).toEqual('Tolkien, J. R. R.')
            done()
          })
          eventsStreamHandler.next(authorNameUpdatedEvent)
        })
      });


      interface Book {
        title: string
        author: string
      }

      interface AuthorNameUpdatedStored extends StoredEvent {
        type: 'AuthorNameUpdated'
        data: { previousName: string, newName: string }
      }

      const BookProjectedCollection: Book[] = [
        {title: '', author: 'Tolkien, J. R R.'},
        {title: '', author: 'Tolkien, J. R R.'},
        {title: '', author: 'Tolkien, J. R R.'},
        {title: '', author: 'Asimov, Isaac'}
      ]


      @EventArtisan.Event({type: 'AuthorNameUpdated', version: 1})
      class AuthorNameUpdated extends SourceEvent<{ previousName: string, newName: string }> {
      }

      class BookProjection extends Projection<Book> {
        title: string
        author: string

        @ProjectionArtisan.EventApplier([AuthorNameUpdated])
        setAuthor(event: AuthorNameUpdatedStored) {
          this.author = event.data.newName
        }
      }

      @ProjectionArtisan.Projector(BookProjection)
      class BooksProjector extends Projector<BookProjection> {
        @ProjectionArtisan.ProjectionAcquirer([AuthorNameUpdated])
        fetchBooksByAuthor(event: AuthorNameUpdatedStored): Promise<Book[]> {
          return Promise.resolve(BookProjectedCollection.filter(b => b.author === event.data.previousName))
        }
      }

    });
  })


  /*
  *
  * Feature: Update a projected collection from events [updated-a-projected-collection.feature]
  *   Scenario: Update a projection with a specific sequence of events
  *
  * Proposed Test:
  *
  * As is not the same adding two numbers and then divide them than divide the first and the add the second,
  * the proposed test is to have the operations stream as:
  *
  * 1 - Add 9
  * 2 - Divide by 3
  * 3 - Add 2
  *
  * The expected outcome shall be 5 instead of 11/3
  *
  * In order to ensure order, when dividing,
  * the fetcher will have a delay that would prevent false positive preventing race conditions
  *
  * */
  describe('Update a projection with a specific sequence of events', () => {

    interface SimpleMathOperation extends StoredEvent {
      type: 'AddedWith' | 'DividedBy'
      data: {
        value: number
      }
    }

    @EventArtisan.Event({
      type: 'AddedWith',
      version: 1
    })
    class AddedWithEvent extends SourceEvent<DataFromStoredEvent<SimpleMathOperation>> {
    }

    @EventArtisan.Event({
      type: 'DividedBy',
      version: 1
    })
    class DividedByEvent extends SourceEvent<DataFromStoredEvent<SimpleMathOperation>> {
    }

    describe('given a projection of numbers', function () {
      let eventsStreamHandler: Subject<StoredEvent>
      let eventsStream: Observable<StoredEvent>
      let projector: ResultProjector
      beforeEach(() => {
        eventsStreamHandler = new Subject()
        eventsStream = eventsStreamHandler.asObservable()
        projector = new ResultProjector()
      })

      describe('When multiple operations event are fired', function () {
        let operationEvents: Array<SimpleMathOperation>
        beforeEach(() => {
          operationEvents = [
            createEventFromData<SimpleMathOperation>('AddedWith', 1, {value: 9}),
            createEventFromData<SimpleMathOperation>('DividedBy', 1, {value: 3}),
            createEventFromData<SimpleMathOperation>('AddedWith', 1, {value: 3})
          ]
          projector.attachStream(eventsStream)
          projector.eventApplied.subscribe(({result}) => {
            MockedDB.set(result)
          })
        })
        it('should apply all operations in the correct order', (done) => {
          projector.eventApplied
            .pipe(skip(2))
            .subscribe(() => {
              expect(MockedDB.get()[0].value).toEqual(6)
              done()
            })

          operationEvents.forEach(event => eventsStreamHandler.next(event))
        })
      })

      interface IResultProjection {
        value: number
      }

      class MockDB<T = unknown> {
        private value = []

        constructor(initial: T[]) {
          this.value = initial
        }

        get() {
          return this.value
        }

        set(newValues) {
          this.value = newValues
        }
      }

      const MockedDB = new MockDB([{value: 0}])

      class ResultProjection extends Projection<IResultProjection> {
        value: number

        @ProjectionArtisan.EventApplier([AddedWithEvent])
        add(event: SimpleMathOperation) {
          this.value += event.data.value
        }

        @ProjectionArtisan.EventApplier([DividedByEvent])
        divide(event: SimpleMathOperation) {
          this.value /= event.data.value
        }
      }

      @ProjectionArtisan.Projector(ResultProjection)
      class ResultProjector extends Projector<ResultProjection> {
        @ProjectionArtisan.ProjectionAcquirer([AddedWithEvent, DividedByEvent])
        async fetchResult(event: SimpleMathOperation) {
          if (event.type === 'DividedBy') {
            return new Promise<ResultProjection[]>(resolve => setTimeout(() => resolve([MockedDB.get()[0]]), 500))
          } else {
            return new Promise<ResultProjection[]>(resolve => setTimeout(() => resolve([MockedDB.get()[0]]), 0))
          }
        }
      }
    })

  })

})

type DataFromStoredEvent<T extends StoredEvent> = T extends StoredEvent<infer Data> ? Data : never
type TypeFromStoredEvent<T extends StoredEvent> = T['type']

function createEventFromData<T extends StoredEvent>(type: TypeFromStoredEvent<T>, version: number, data: DataFromStoredEvent<T>): T {

  return {
    id: 'abcd-1234',
    type,
    data,
    updatedAt: new Date(Date.now()),
    createdAt: new Date(Date.now()),
    meta: {},
    version
  } as T
}
