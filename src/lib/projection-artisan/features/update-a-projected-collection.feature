Feature: Update a projected collection from events

  Scenario: Update the name of an author
    Given a persisted ProjectedCollection of Book<{ title: string, author: string }>
    When the event AuthorsNameUpdated is fired
    Then all books that previously had that Author, get updated.


  Scenario: Update a projection with a specific sequence of events
    Given a persisted collection of numbers
    When a multiple operations event are fired
    Then all operations shall be executed in the correct order
