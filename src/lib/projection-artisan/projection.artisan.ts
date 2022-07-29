import {EventApplierDecorator, ProjectionAcquirerDecorator} from "./projection.decorators";

export class ProjectionArtisan {
  public static ProjectionAcquirer = ProjectionAcquirerDecorator
  public static EventApplier = EventApplierDecorator
}
