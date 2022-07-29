import {ProjectionArtisan} from "./projection.artisan";
import {Observable, Subject} from "rxjs";
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
        authorNameUpdatedEvent = {
          id: 'abcd-1234',
          type: 'AuthorNameUpdated',
          data: {previousName: 'Tolkien, J. R R.', newName: 'Tolkien, J. R. R.'},
          updatedAt: new Date(Date.now()),
          createdAt: new Date(Date.now()),
          meta: {},
          version: 1
        }
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

    class BooksProjector extends Projector<BookProjection> {
      @ProjectionArtisan.ProjectionAcquirer([AuthorNameUpdated])
      fetchBooksByAuthor(event: AuthorNameUpdatedStored): Promise<BookProjection[]>{
        return Promise.resolve(BookProjectedCollection.filter(b => b.author === event.data.previousName).map(book => new BookProjection(book)))
      }
    }

    class BookProjection extends Projection {
      title: string
      author: string

      @ProjectionArtisan.EventApplier([AuthorNameUpdated])
      setAuthor(event: AuthorNameUpdatedStored) {
        this.author = event.data.newName
      }
    }

  });

  /*
  *
  * Feature: Update a projected collection from events [updated-a-projected-collection.feature]
  *   Scenario: Update a projection with a specific sequence of events
  *
  * */

  describe('given a persisted collection of numbers', function () {
    describe('When a multiple operations event are fired', function () {
      it('should apply all operations in the correct order', function () {
        expect(true).toBe(true)
      })
    })
  })

})
