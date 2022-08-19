import { ecs } from "@cdktf/provider-aws"
import { Fn } from "cdktf"
import { Construct } from "constructs"
import { Tfvars } from "./variables"

export class EcsCluster extends Construct {
  public cluster: ecs.EcsCluster

  constructor(
    scope: Construct,
    name: string,
    vars: Tfvars
  ) {
    super(scope, name)

    const nameTagPrefix = `${Fn.lookup(vars.defaultTags, "project", "")}`

    this.cluster = new ecs.EcsCluster(this, "cluster", {
      name: `${nameTagPrefix}-cluster`,
    })
  }
}