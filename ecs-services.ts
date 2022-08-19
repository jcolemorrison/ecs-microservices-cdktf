import { ecs, vpc } from "@cdktf/provider-aws"
import { Fn } from "cdktf"
import { Construct } from "constructs"
import { Tfvars } from "./variables"

export class EcsServiceClient extends Construct {
  public service: ecs.EcsService

  constructor(
    scope: Construct,
    name: string,
    vars: Tfvars,
    clusterArn: string,
    taskDefinitionArn: string,
    targetGroupArn: string,
    subnets: vpc.Subnet[],
    clientSecurityGroupId: string
  ) {
    super(scope, name)

    const nameTagPrefix = `${Fn.lookup(vars.defaultTags, "project", "")}`

    this.service = new ecs.EcsService(this, name, {
      name: `${nameTagPrefix}-client`,
      cluster: clusterArn,
      taskDefinition: taskDefinitionArn,
      desiredCount: 1,
      launchType: "FARGATE",

      loadBalancer: [
        {
          targetGroupArn,
          containerName: "client",
          containerPort: 9090,
        },
      ],

      networkConfiguration: {
        subnets: subnets.map((subnet) => subnet.id),
        assignPublicIp: false,
        securityGroups: [clientSecurityGroupId],
      },
    })
  }
}

export class EcsServiceUpstream extends Construct {
  public service: ecs.EcsService

  constructor(
    scope: Construct,
    name: string,
    vars: Tfvars,
    clusterArn: string,
    taskDefinitionArn: string,
    targetGroupArn: string,
    subnets: vpc.Subnet[],
    securityGroupId: string
  ) {
    super(scope, name)

    const nameTagPrefix = `${Fn.lookup(vars.defaultTags, "project", "")}`

    this.service = new ecs.EcsService(this, name, {
      name: `${nameTagPrefix}-${name}`,
      cluster: clusterArn,
      taskDefinition: taskDefinitionArn,
      desiredCount: 1,
      launchType: "FARGATE",

      loadBalancer: [
        {
          targetGroupArn,
          containerName: name,
          containerPort: 9090,
        },
      ],

      networkConfiguration: {
        subnets: subnets.map((subnet) => subnet.id),
        assignPublicIp: false,
        securityGroups: [securityGroupId],
      },
    })
  }
}