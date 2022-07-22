import {MixinsComposer} from "@doesrobbiedream/ts-utils";
import {SourceEvent} from "./source-event.class";
import {LegacyEventMixin} from "./mixins/legacy-event.mixin";

export class LegacyEvent<Data, Meta> extends MixinsComposer([LegacyEventMixin], SourceEvent) {
  data: Data
  meta: Meta
}
