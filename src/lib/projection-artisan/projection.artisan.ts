import {EventApplierDecorator, ProjectionAcquirerDecorator, ProjectorDecorator} from "./projection.decorators";

export class ProjectionArtisan {
  public static Projector = ProjectorDecorator
  public static ProjectionAcquirer = ProjectionAcquirerDecorator
  public static EventApplier = EventApplierDecorator
}
