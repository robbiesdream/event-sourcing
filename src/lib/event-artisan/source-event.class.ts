import {EmptyObject, StoredEvent, UnknownObject} from "./event.types";
import {EventArtisan} from "./event.artisan";
import {MixinsComposer, NoopMixinBase} from "@doesrobbiedream/ts-utils";
import {EventLoaderMixin} from "./mixins/event-loader.mixin";
import {EventSerializerMixin} from "./mixins/event-serializer.mixin";
import {LegacyEventMixin} from "./mixins/legacy-event.mixin";

export class SourceEvent<Data = UnknownObject, Meta = EmptyObject> extends MixinsComposer([LegacyEventMixin, EventLoaderMixin, EventSerializerMixin], NoopMixinBase) implements StoredEvent<Data, Meta> {
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
