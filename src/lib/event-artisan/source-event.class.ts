import {StoredEvent} from "./event.types";
import {EventArtisan} from "./event.artisan";
import {MixinsComposer, NoopMixinBase, Type} from "@doesrobbiedream/ts-utils";
import {EventLoaderMixin} from "./mixins/event-loader.mixin";
import {EventSerializerMixin} from "./mixins/event-serializer.mixin";
import {LegacyEventMixin} from "./mixins/legacy-event.mixin";
import {EventDecoratedKeys} from "./event.decorators";

export class SourceEvent<Data = unknown, Meta = unknown> extends MixinsComposer([LegacyEventMixin, EventLoaderMixin, EventSerializerMixin], NoopMixinBase) implements StoredEvent<Data, Meta> {
  public static getIndex(event: Type<SourceEvent>){
    const type = Reflect.getMetadata(EventDecoratedKeys.Type, event)
    const version = Reflect.getMetadata(EventDecoratedKeys.Version, event)
    return `${type}@${version}`
  }
  public static getIndexFromStored(event: StoredEvent){
    return `${event.type}@${event.version}`
  }
  @EventArtisan.Type
  public type: string
  @EventArtisan.Version
  public version: number
  public id: string
  public createdAt: Date
  public updatedAt: Date
  public data: Data;
  public meta: Meta;

  constructor() {
    super();
  }
}
