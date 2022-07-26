import {MixinArtisan, Type} from "@doesrobbiedream/ts-utils";
import {Upcaster} from "../event.types";
import {EventDecoratedKeys} from "../event.decorators";

export class LegacyEvent {
  public static isLegacy(event: unknown): event is LegacyEvent {
    return Boolean(Reflect.getMetadata(EventDecoratedKeys.IsLegacy, event.constructor))
  }

  public lift(upcastToVersion?: number) {
    if (!LegacyEvent.isLegacy(this)) {
      return this
    }

    const targetConstructor: Type<Upcaster<this>> = Reflect.getMetadata(EventDecoratedKeys.Target, this.constructor)

    const targetVersion = Reflect.getMetadata(EventDecoratedKeys.Version, targetConstructor)

    const targetEvent = new targetConstructor().upcast(this)

    if ((typeof upcastToVersion === 'number' && upcastToVersion === targetVersion) || !LegacyEvent.isLegacy(targetEvent)) {
      return targetEvent
    }

    return targetEvent.lift(upcastToVersion)
  }
}

export const LegacyEventMixin = MixinArtisan.craft(LegacyEvent)
