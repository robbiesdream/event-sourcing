import {MixinArtisan, Type} from "@doesrobbiedream/ts-utils";
import {Upcaster} from "../event.types";
import {EventDecoratedKeys} from "../event.decorators";
import {SourceEvent} from "../source-event.class";

export class LegacyEvent {
  public static isLegacy(event: unknown): event is LegacyEvent {
    const typeChecker = Boolean(Reflect.getMetadata(EventDecoratedKeys.IsLegacy, event.constructor))
    const instanceChecker = Boolean(Reflect.getMetadata(EventDecoratedKeys.IsLegacy, event))

    return typeChecker || instanceChecker
  }

  public lift(upcastToVersion?: number): SourceEvent {
    if (!LegacyEvent.isLegacy(this)) {
      return this
    }

    const targetConstructor: Type<SourceEvent & Upcaster> = Reflect.getMetadata(EventDecoratedKeys.Target, this.constructor)

    const targetVersion = Reflect.getMetadata(EventDecoratedKeys.Version, targetConstructor)

    const targetEvent: SourceEvent & Upcaster = new targetConstructor()
    targetEvent.upcast(this as unknown as SourceEvent)

    if ((typeof upcastToVersion === 'number' && upcastToVersion === targetVersion) || !LegacyEvent.isLegacy(targetEvent)) {
      return targetEvent
    }

    return targetEvent.lift(upcastToVersion)
  }
}

export const LegacyEventMixin = MixinArtisan.craft(LegacyEvent)
