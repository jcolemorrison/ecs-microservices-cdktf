import { vpc } from "@cdktf/provider-aws"
import { Fn } from "cdktf"
import { Construct } from "constructs"
import { Tfvars } from "./variables"

export class SecurityGroups extends Construct {
  public clientAlb: vpc.SecurityGroup
  public clientService: vpc.SecurityGroup
  public upstreamServiceAlb: vpc.SecurityGroup
  public upstreamService: vpc.SecurityGroup
  public database: vpc.SecurityGroup
  
  constructor(
    scope: Construct,
    name: string,
    vars: Tfvars,
    vpcId: string
  ) {
    super(scope, name)

    const nameTagPrefix = `${Fn.lookup(vars.defaultTags, "project", "")}`

    // reusable ingress 80 rule
    const allowIngress80 = (
      securityGroupId: string,
      constructId: string
    ) => (
      new vpc.SecurityGroupRule(this, constructId, {
        securityGroupId,
        type: "ingress",
        protocol: "tcp",
        fromPort: 80,
        toPort: 80,
        cidrBlocks: ["0.0.0.0/0"],
        ipv6CidrBlocks: ["::/0"],
        description: "Allow HTTP traffic",
      })
    )

    // reusable egress all rule
    const allowEgressAll = (
      securityGroupId: string,
      constructId: string
    ) => (
      new vpc.SecurityGroupRule(this, constructId, {
        securityGroupId,
        type: "egress",
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
        ipv6CidrBlocks: ["::/0"],
        description: "Allow any outbound traffic",
      })
    )

    const allowInboundSelf = (
      securityGroupId: string,
      constructId: string
    ) => (
      new vpc.SecurityGroupRule(this, constructId, {
        securityGroupId,
        type: "ingress",
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        selfAttribute: true,
        description: "Allow any outbound traffic from others with same security group"
      })
    )


    // Client Application Load Balancer Security Group and Rules
    this.clientAlb = new vpc.SecurityGroup(this, "client_alb_security_group", {
      namePrefix: `${nameTagPrefix}-ecs-client-alb`,
      description: "security group for client service application load balancer",
      vpcId,
    })
    allowIngress80(this.clientAlb.id, "client_alb_allow_80")
    allowEgressAll(this.clientAlb.id, "client_alb_allow_outbound")


    // Client Service Security Group and Rules
    this.clientService = new vpc.SecurityGroup(this, "client_service", {
      namePrefix: `${nameTagPrefix}-client-service`,
      description: "security group for client service",
      vpcId,
    })

    new vpc.SecurityGroupRule(this, "client_service_allow_alb_9090", {
      securityGroupId: this.clientService.id,
      type: "ingress",
      protocol: "tcp",
      fromPort: 9090,
      toPort: 9090,
      sourceSecurityGroupId: this.clientAlb.id,
      description: "Allow HTTP traffic on 9090 from the Client ALB",
    })
    allowInboundSelf(this.clientService.id, "client_service_allow_inbound_self")
    allowEgressAll(this.clientService.id, "client_service_allow_outbound")


    // Upstream Service ALB Security Group and Rules
    this.upstreamServiceAlb = new vpc.SecurityGroup(this, "upstream_service_alb", {
      namePrefix: `${nameTagPrefix}-upstream-service-alb`,
      description: "security group for upstream services ALB",
      vpcId,
    })

    new vpc.SecurityGroupRule(this, "upstream_service_alb_allow_client_80", {
      securityGroupId: this.upstreamServiceAlb.id,
      type: "ingress",
      protocol: "tcp",
      fromPort: 80,
      toPort: 80,
      // sourceSecurityGroupId: this.clientService.id,
      cidrBlocks: ["0.0.0.0/0"],
      description: "Allow HTTP traffic on 80 from the Client Service",
    })
    allowEgressAll(this.upstreamServiceAlb.id, "upstream_service_alb_allow_outbound")

    // Upstream Service Security Group and Rules
    this.upstreamService = new vpc.SecurityGroup(this, "upstream_service", {
      namePrefix: `${nameTagPrefix}-upstream-service`,
      description: "security group for upstream services",
      vpcId,
    })

    new vpc.SecurityGroupRule(this, "upstream_service_allow_alb_9090", {
      securityGroupId: this.upstreamService.id,
      type: "ingress",
      protocol: "tcp",
      fromPort: 9090,
      toPort: 9090,
      sourceSecurityGroupId: this.upstreamServiceAlb.id,
      description: "Allow HTTP traffic on 9090 from the Upstream Service ALB",
    })
    allowInboundSelf(this.upstreamService.id, "upstream_service_allow_inbound_self")
    allowEgressAll(this.upstreamService.id, "upstream_service_allow_outbound")


    // Database Security Group and Rules
    this.database = new vpc.SecurityGroup(this, "database", {
      namePrefix: `${nameTagPrefix}-database`,
      description: "security group for the database",
      vpcId,
    })

    new vpc.SecurityGroupRule(this, "database_allow_service_27017", {
      securityGroupId: this.database.id,
      type: "ingress",
      protocol: "tcp",
      fromPort: 27017,
      toPort: 27017,
      sourceSecurityGroupId: this.upstreamService.id,
      description: "Allow HTTP traffic on 27017 from the Upstream Services",
    })
    allowEgressAll(this.database.id, "database_allow_outbound")
  }
}

