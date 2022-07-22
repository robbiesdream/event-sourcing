export class LiftingNonLegacyEventException extends Error {
  constructor() {
    super('You cannot lift a non-legacy event. If this is a legacy event, be sure to apply the @LegacyFor Decorator on it.');
  }
}
