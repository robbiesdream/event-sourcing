Feature: Build a projection from StoredEvents

  Scenario: Building a projection of sentences from words
    Given I have an event store of word events
    And events have different types and versions
    When building from scratch the sentences projection
    Then I get all events processed
    And my sentences are built

