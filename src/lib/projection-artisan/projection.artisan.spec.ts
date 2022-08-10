import {ProjectionArtisan} from "./projection.artisan";
import {filter, Subject, switchMap} from "rxjs";
import {StoredEvent, Upcaster} from "../event-artisan/event.types";
import {Projector} from "./projector.class";
import {Projection} from "./projection.class";
import {SourceEvent} from "../event-artisan/source-event.class";
import {EventArtisan} from "../event-artisan/event.artisan";
import {MockDB} from "./tests/mocked-db";
import {randomUUID} from "crypto";


type DataFromStoredEvent<T extends StoredEvent> = T extends StoredEvent<infer Data> ? Data : never
type TypeFromStoredEvent<T extends StoredEvent> = T['type']

function createEventFromData<T extends StoredEvent>(type: TypeFromStoredEvent<T>, version: number, data: DataFromStoredEvent<T>, overwrite: Record<string, unknown> = {}): T {
  return {
    id: randomUUID(),
    type,
    data,
    updatedAt: new Date(Date.now()),
    createdAt: new Date(Date.now()),
    meta: {},
    version,
    ...overwrite
  } as T
}


describe(ProjectionArtisan.name, function () {

  describe('Update a projected collection from events', () => {
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
        const BookProjectedCollection: Book[] = [
          {id: randomUUID(), title: '', author: 'Tolkien, J. R R.'},
          {id: randomUUID(), title: '', author: 'Tolkien, J. R R.'},
          {id: randomUUID(), title: '', author: 'Tolkien, J. R R.'},
          {id: randomUUID(), title: '', author: 'Asimov, Isaac'}
        ]
        const booksProjectionsDB: MockDB<Book> = new MockDB()

        let eventsStream: Subject<StoredEvent>
        let projector: Projector<BookProjection>

        beforeEach(async () => {
          projector = new BooksProjector()
          await booksProjectionsDB.saveAll(BookProjectedCollection)
        })

        describe('when the event AuthorsNameUpdated is fired', function () {
          let authorNameUpdatedEvent: AuthorNameUpdatedStored
          beforeEach(() => {
            authorNameUpdatedEvent = createEventFromData<AuthorNameUpdatedStored>('AuthorNameUpdated', 1, {
              previousName: 'Tolkien, J. R R.',
              newName: 'Tolkien, J. R. R.'
            })
          })
          it('should update all the books that previously had that author\'s name', function (done) {
            eventsStream = new Subject()
            projector.attachStream(eventsStream).afterEach
              .pipe(filter(event => event.type === 'AuthorNameUpdated'))
              .subscribe(async () => {
                const books = await booksProjectionsDB.get()
                expect(books.filter(b => b.author === 'Tolkien, J. R. R.')).toHaveLength(3)
                done()
              })

            eventsStream.next(authorNameUpdatedEvent)
          })
        });


        interface Book {
          id: string
          title: string
          author: string
        }

        interface AuthorNameUpdatedStored extends StoredEvent {
          type: 'AuthorNameUpdated'
          data: { previousName: string, newName: string }
        }


        @EventArtisan.Event({type: 'AuthorNameUpdated', version: 1})
        class AuthorNameUpdated extends SourceEvent<{ previousName: string, newName: string }> {
        }

        class BookProjection extends Projection<Book> {
          id: string
          title: string
          author: string

          @ProjectionArtisan.EventApplier([AuthorNameUpdated])
          async setAuthor(event: AuthorNameUpdated) {
            this.author = event.data.newName
          }
        }

        @ProjectionArtisan.Projector(BookProjection)
        class BooksProjector extends Projector<BookProjection> {
          @ProjectionArtisan.AfterEachOfType([AuthorNameUpdated])
          async save(projection: Array<BookProjection>) {
            await booksProjectionsDB.saveAll(projection)
          }

          @ProjectionArtisan.ProjectionAcquirer([AuthorNameUpdated])
          async fetchBooksByAuthor(event: AuthorNameUpdatedStored): Promise<Book[]> {
            return (await booksProjectionsDB.get()).filter(b => b.author === event.data.previousName)
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
    * 3 - Add 3
    *
    * The expected outcome shall be 6 instead of 4
    *
    * In order to ensure order, when dividing,
    * the fetcher will have a delay that would prevent false positive preventing race conditions
    *
    * */
    describe('Update a projection with a specific sequence of events', () => {

      interface SimpleMathOperation extends StoredEvent {
        type: 'AddedWith' | 'DividedBy'
        data: {
          id: string
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
        let projector: ResultProjector
        beforeEach(() => {
          projector = new ResultProjector()
          resultsProjectionStore.saveAll([{id: '1', value: 0}])
        })

        describe('When multiple operations event are fired', function () {
          let operationEvents: Array<SimpleMathOperation>
          beforeEach(() => {
            operationEvents = [
              createEventFromData<SimpleMathOperation>('AddedWith', 1, {id: '1', value: 9}),
              createEventFromData<SimpleMathOperation>('DividedBy', 1, {id: '1', value: 3}),
              createEventFromData<SimpleMathOperation>('AddedWith', 1, {id: '1', value: 3})
            ]
          })
          it('should apply all operations in the correct order', (done) => {
            projector.process(operationEvents).onFinished.subscribe(async () => {
              const result = (await resultsProjectionStore.get())[0]
              expect(result.value).toEqual(6)
              done()
            })

          })
        })

        interface IResultProjection {
          id: string
          value: number
        }

        const resultsProjectionStore = new MockDB<{ id: string, value: number }>()

        class ResultProjection extends Projection<IResultProjection> {
          value: number

          @ProjectionArtisan.EventApplier([AddedWithEvent])
          async add(event: AddedWithEvent) {
            this.value += event.data.value
          }

          @ProjectionArtisan.EventApplier([DividedByEvent])
          async divide(event: DividedByEvent) {
            this.value /= event.data.value
          }
        }

        @ProjectionArtisan.Projector(ResultProjection)
        class ResultProjector extends Projector<ResultProjection> {

          @ProjectionArtisan.AfterEach()
          async save(projection: IResultProjection[]) {
            await resultsProjectionStore.saveAll(projection)
          }

          @ProjectionArtisan.ProjectionAcquirer([AddedWithEvent, DividedByEvent])
          async fetchResult(event: SimpleMathOperation) {
            const result = (await resultsProjectionStore.get())[0]
            if (event.type === 'DividedBy') {
              return new Promise<IResultProjection[]>(resolve => setTimeout(() => resolve([result]), 500))
            } else {
              return new Promise<IResultProjection[]>(resolve => setTimeout(() => resolve([result]), 0))
            }
          }
        }
      })

    })
  })

  describe('Building a projection of words from stored events', () => {
    const eventStore: MockDB<StoredEvent> = new MockDB();
    const projectionDB: MockDB<Sentence> = new MockDB();

    type SentenceID = string;

    interface Sentence {
      id: SentenceID
      sentence: string
    }

    interface WordData {
      sentence: SentenceID
      word: string
    }

    interface PositionedWordData extends WordData {
      position: number
    }

    @EventArtisan.Event({
      type: 'InitializeSentence',
      version: 1
    })
    class InitializeSentence extends SourceEvent<{ id: SentenceID }> {

    }

    @EventArtisan.Event({
      type: 'AddWord',
      version: 2
    })
    class AddPositionedWord extends SourceEvent<PositionedWordData> implements Upcaster<AddWord> {
      upcast(event: AddWord) {
        this.fromRawData({...event.data, position: -1}, null)
      }
    }

    @EventArtisan.LegacyOf(AddPositionedWord)
    @EventArtisan.Event({
      type: 'AddWord',
      version: 1
    })
    class AddWord extends SourceEvent<WordData> {
    }

    @EventArtisan.Event({
      type: 'RemoveWord',
      version: 1
    })
    class RemoveWord extends SourceEvent<PositionedWordData> {
    }

    class SentencesProjection extends Projection<Sentence> implements Sentence {
      id: SentenceID
      sentence: string

      @ProjectionArtisan.EventApplier(InitializeSentence)
      async initialize(event: InitializeSentence) {
        this.id = event.data.id
        this.sentence = ''
        return;
      }

      @ProjectionArtisan.EventApplier([AddWord, AddPositionedWord])
      async addWord(event: AddPositionedWord) {
        const words = this.sentence.split(' ').filter((w) => w !== '');
        const position = event.data.position === -1 ? words.length : event.data.position
        words.splice(position, 0, event.data.word)

        this.sentence = words.join(' ');
      }

      @ProjectionArtisan.EventApplier([RemoveWord])
      async removeWord(event: RemoveWord) {
        const words = this.sentence.split(' ');
        const index = words.indexOf(event.data.word)
        words.splice(index, 1)

        this.sentence = words.join(' ')
      }
    }

    @ProjectionArtisan.Projector(SentencesProjection)
    class SentencesProjector extends Projector<SentencesProjection> {

      constructor(protected projectionStore: MockDB<Sentence>) {
        super();
      }

      @ProjectionArtisan.AfterEach()
      async save(sentences: Sentence[]) {
        await this.projectionStore.saveAll(sentences)
      }

      @ProjectionArtisan.ProjectionAcquirer([InitializeSentence])
      async getNewSentence(event: StoredEvent<null>): Promise<[Sentence]> {
        return [{id: event.id, sentence: ''}]
      }

      @ProjectionArtisan.ProjectionAcquirer([AddWord, AddPositionedWord, RemoveWord])
      async getSentenceByID(event: StoredEvent<PositionedWordData>): Promise<Sentence[]> {
        const sentence = await this.projectionStore.getOne(event.data.sentence)
        return [sentence]
      }
    }

    describe('I have an event store of word events', () => {
      describe('and events have different types and versions', () => {
        const sentenceId = randomUUID()
        beforeAll(async () => {
          await eventStore.saveAll([
            createEventFromData<InitializeSentence>('InitializeSentence', 1, {id: sentenceId}),
            createEventFromData<AddWord>('AddWord', 1, {word: 'Hello', sentence: sentenceId}),
            createEventFromData<AddWord>('AddWord', 1, {word: 'from', sentence: sentenceId}),
            createEventFromData<AddWord>('AddWord', 1, {word: 'Argentina', sentence: sentenceId}),
            createEventFromData<AddWord>('RemoveWord', 1, {word: 'Argentina', sentence: sentenceId}),
            createEventFromData<AddWord>('AddWord', 1, {word: 'Spain!', sentence: sentenceId}),
            createEventFromData<AddPositionedWord>('AddWord', 2, {word: 'World', sentence: sentenceId, position: 1}),
          ])
        })

        describe('when building from scratch the sentences projection', () => {
          let events: StoredEvent[]
          beforeEach(async () => {
            events = await eventStore.get()
          })
          it('should get all events processed and my sentences are built', (done) => {
            const projector = new SentencesProjector(projectionDB)
            projector.process(events).onFinished.pipe(switchMap(() => projectionDB.get())).subscribe((projected) => {
              expect(projected).toEqual([{id: sentenceId, sentence: 'Hello World from Spain!'}])
              done()
            })
          })
        });
      });
    });
  });

  describe.skip('Stressing the system', () => {
    const ProjectionsDB = new MockDB()
    let processed = 0

    interface SomeEventWithTonsOfDataData {
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

    @EventArtisan.Event({
      type: 'SomeEventWithTonsOfData',
      version: 1
    })
    class SomeEventWithTonsOfData extends SourceEvent<SomeEventWithTonsOfDataData> {
    }

    interface SomeVersionedEventV1Data {
      iAmAnOldProperty: string
    }

    interface SomeVersionedEventV2Data {
      iAmTheNewProperty: string
    }

    @EventArtisan.Event({
      type: 'SomeVersionedEvent',
      version: 2
    })
    class SomeVersionedEventV2 extends SourceEvent<SomeVersionedEventV2Data> implements Upcaster<SomeVersionedEventV1> {
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
    class SomeVersionedEventV1 extends SourceEvent<SomeVersionedEventV1Data> {
    }


    class TheAnyProjection extends Projection {
      id: string

      @ProjectionArtisan.EventApplier([SomeVersionedEventV1, SomeVersionedEventV2, SomeEventWithTonsOfData])
      async anyEventApplier(event: StoredEvent) {
        this.id = event.id
      }
    }

    @ProjectionArtisan.Projector(TheAnyProjection)
    class TheAnyProjector extends Projector<TheAnyProjection> {

      @ProjectionArtisan.AfterEach()
      async save(projection: TheAnyProjection[]) {
        if(processed % 10 === 0){
          console.log(processed)
        }
        await ProjectionsDB.saveAll(projection)
        processed++
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

    describe('when processing huge amounts of events', () => {
      jest.setTimeout(1000000)
      const stressRatio = 1000
      let projector: TheAnyProjector
      let events: StoredEvent[]
      beforeAll(() => {
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
        projector = new TheAnyProjector()
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
})


