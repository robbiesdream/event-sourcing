# Event Sourcing - NodeJS + Typescript

> This library is intended to be a lean dev-experience oriented implementation for event sourcing techniques.
> 
> In general, the goal of this library will be to implement the general aspects of this development philosophy with an intuitive and declarative interface that hides the complexity of the infrastructure but opens allows customization and extensibility.

## Core Feature Modules

### Aggregate Artisan
> Set of tools designed for defining business entities that can process Business Events and enclose the Business Logic Representation within.
> 
> The main aspect of this design, is that the Aggregate is responsible for defining whether an action can be performed or not on a given state derived from previous events.

### Event Artisan
> Set of tools designed for generating Versioned Business Events. 
> 
> This design will follow the principles of Upcastable Events for handling different version of events without adding code complexity and avoiding unnecessary efforts on maintenance.

### Projector
> The projector will expose features for managing collections with states derived from stored business events, using checkpoints as a performance optimization.
> 
