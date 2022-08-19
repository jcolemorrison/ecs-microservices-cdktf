import * as cdktf from "cdktf"
import { Construct } from "constructs"

export class Tfvars extends Construct {
  public defaultTags?: { [key: string]: string }
  public vpcCidr: string
  public defaultRegion: string
  public databasePrivateIp: string

  constructor(
    scope: Construct,
    name: string
  ) {
    super(scope, name)

    // this.defaultRegion = new cdktf.TerraformVariable(this, "default_region", {
    //   default: "us-east-1",
    //   description: "Default AWS region to apply to"
    // }).value

    this.defaultRegion = "us-east-1"

    this.databasePrivateIp = "10.255.3.253"

    this.defaultTags = new cdktf.TerraformVariable(this, "default_tags", {
      default: {
        project: "ecs-microservices-cdktf",
      },
      description: "Map of default tags to apply to resources",
    }).value

    this.vpcCidr = new cdktf.TerraformVariable(this, "vpc_cidr", {
      default: "10.255.0.0/20",
      description: "CIDR block for VPC",
    }).value
  }
}