import {EventDecoratorFactory, LegacyEventDecoratorFactory, TypeDecorator, VersionDecorator} from "./event.decorators";

export class EventArtisan {
  public static Event = EventDecoratorFactory
  public static LegacyOf = LegacyEventDecoratorFactory
  public static Version = VersionDecorator
  public static Type = TypeDecorator
}
