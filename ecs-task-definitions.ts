import { ecs } from "@cdktf/provider-aws"
import { Fn } from "cdktf"
import { Construct } from "constructs"
import { Tfvars } from "./variables"

export class EcsTaskDefinitionClient extends Construct {
  public def: ecs.EcsTaskDefinition

  constructor(
    scope: Construct,
    name: string,
    vars: Tfvars,
    upstreamUriString: string,
    executionRoleArn: string
  ) {
    super(scope, name)

    const nameTagPrefix = `${Fn.lookup(vars.defaultTags, "project", "")}`

    this.def = new ecs.EcsTaskDefinition(
      this,
      "task_definition",
      {
        family: `${nameTagPrefix}-client`,
        memory: "512",
        cpu: "256",
        networkMode: "awsvpc",
        executionRoleArn,

        containerDefinitions: Fn.jsonencode([
          {
            name: "client",
            image: "nicholasjackson/fake-service:v0.23.1",
            cpu: 0,
            essential: true,

            portMappings: [
              {
                containerPort: 9090,
                hostPort: 9090,
                protocol: "tcp",
              },
            ],

            environment: [
              {
                name: "NAME",
                value: "client",
              },
              {
                name: "MESSAGE",
                value: "Hello World from the client!",
              },
              {
                name: "UPSTREAM_URIS",
                value: upstreamUriString
              }
            ],
          },
          {
            name: "datadog-agent",
            image: "public.ecr.aws/datadog/agent:latest",
            environment: [
              {
                name: "DD_API_KEY",
                value: `${process.env.DD_API_KEY}`
              },
              {
                name: "ECS_FARGATE",
                value: "true" // https://github.com/aws/amazon-ecs-agent/issues/2571, seems that unmarshal in Go doesn't allow for straight booleans
              }
            ]
          }
        ]),
      }
    )
  }
}

export class EcsTaskDefinitionGold extends Construct {
  public def: ecs.EcsTaskDefinition
  
  constructor(
    scope: Construct,
    name: string,
    vars: Tfvars,
    executionRoleArn: string
  ) {
    super(scope, name)

    const nameTagPrefix = `${Fn.lookup(vars.defaultTags, "project", "")}`

    this.def = new ecs.EcsTaskDefinition(
      this,
      "task_definition",
      {
        family: `${nameTagPrefix}-gold`,
        memory: "512",
        cpu: "256",
        networkMode: "awsvpc",
        executionRoleArn,

        containerDefinitions: Fn.jsonencode([
          {
            name: "gold",
            image: "nicholasjackson/fake-service:v0.23.1",
            cpu: 0,
            essential: true,

            portMappings: [
              {
                containerPort: 9090,
                hostPort: 9090,
                protocol: "tcp",
              },
            ],

            environment: [
              {
                name: "NAME",
                value: "gold",
              },
              {
                name: "MESSAGE",
                value: "Hello World from the gold service!",
              },
              {
                name: "UPSTREAM_URIS",
                value: `http://${vars.databasePrivateIp}:27017`
              }
            ],
          },
          {
            name: "datadog-agent",
            image: "public.ecr.aws/datadog/agent:latest",
            environment: [
              {
                name: "DD_API_KEY",
                value: `${process.env.DD_API_KEY}`
              },
              {
                name: "ECS_FARGATE",
                value: "true" // https://github.com/aws/amazon-ecs-agent/issues/2571, seems that unmarshal in Go doesn't allow for straight booleans
              }
            ]
          }
        ]),
      }
    )
  }
}

export class EcsTaskDefinitionSilver extends Construct {
  public def: ecs.EcsTaskDefinition
  
  constructor(
    scope: Construct,
    name: string,
    vars: Tfvars,
    executionRoleArn: string
  ) {
    super(scope, name)

    const nameTagPrefix = `${Fn.lookup(vars.defaultTags, "project", "")}`

    this.def = new ecs.EcsTaskDefinition(
      this,
      "task_definition",
      {
        family: `${nameTagPrefix}-silver`,
        memory: "512",
        cpu: "256",
        networkMode: "awsvpc",
        executionRoleArn,

        containerDefinitions: Fn.jsonencode([
          {
            name: "silver",
            image: "nicholasjackson/fake-service:v0.23.1",
            cpu: 0,
            essential: true,

            portMappings: [
              {
                containerPort: 9090,
                hostPort: 9090,
                protocol: "tcp",
              },
            ],

            environment: [
              {
                name: "NAME",
                value: "silver",
              },
              {
                name: "MESSAGE",
                value: "Hello World from the silver service!",
              },
              {
                name: "UPSTREAM_URIS",
                value: `http://${vars.databasePrivateIp}:27017`
              }
            ],
          },
          {
            name: "datadog-agent",
            image: "public.ecr.aws/datadog/agent:latest",
            environment: [
              {
                name: "DD_API_KEY",
                value: `${process.env.DD_API_KEY}`
              },
              {
                name: "ECS_FARGATE",
                value: "true" // https://github.com/aws/amazon-ecs-agent/issues/2571, seems that unmarshal in Go doesn't allow for straight booleans
              }
            ]
          }
        ]),
      }
    )
  }
}