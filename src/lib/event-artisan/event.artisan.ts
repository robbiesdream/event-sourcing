import {EventDecoratorFactory, TypeDecorator, VersionDecorator} from "./event.decorators";

export class EventArtisan {
  public static Event = EventDecoratorFactory
  public static Version = VersionDecorator
  public static Type = TypeDecorator
}
