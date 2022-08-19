import { Construct } from "constructs"
import { App, TerraformStack, RemoteBackend, TerraformOutput } from "cdktf"
import { AwsProvider } from "@cdktf/provider-aws"
import { Tfvars } from "./variables"
import { Network } from "./vpc"
import { SecurityGroups } from "./security-groups"
import { EcsCluster } from "./ecs-cluster"
import { EcsTaskDefinitionClient, EcsTaskDefinitionGold, EcsTaskDefinitionSilver } from "./ecs-task-definitions"
import { ClientAlb, UpstreamServiceAlb } from "./ecs-albs"
import { EcsServiceClient, EcsServiceUpstream } from "./ecs-services"
import { Database } from "./ec2"
import { EcsMonitoringIamTaskExecRole } from "./iam"
import { DDClusterCpuMonitor } from "./monitors"
import { DatadogProvider } from "@cdktf/provider-datadog"

class MyStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    // Equivalent to having a variables.tf available
    const vars = new Tfvars(this, "main")

    new AwsProvider(this, "AWS", {
      region: vars.defaultRegion
    })

    // The AWS VPC
    const vpc = new Network(this, "network", vars)

    // All Security Groups
    const securityGroups = new SecurityGroups(this, "security", vars, vpc.vpc.id)

    // Iam Roles
    const monitoringIamRole = new EcsMonitoringIamTaskExecRole(this, "task-monitoring-role", vars)

    // The ECS Cluster
    const { cluster } = new EcsCluster(this, "cluster", vars)

    // Load Balancers - Need to come first for references in Task Definitions
    const clientAlb = new ClientAlb(
      this, 
      "client_alb",
      vars, 
      vpc.publicSubnets,
      securityGroups.clientAlb.id,
      vpc.vpc.id
    )

    const goldAlb = new UpstreamServiceAlb(
      this,
      "gold_alb",
      vars,
      vpc.privateSubnets,
      securityGroups.upstreamServiceAlb.id,
      vpc.vpc.id
    )

    const silverAlb = new UpstreamServiceAlb(
      this,
      "silver_alb",
      vars,
      vpc.privateSubnets,
      securityGroups.upstreamServiceAlb.id,
      vpc.vpc.id
    )

    // The Database
    new Database(
      this,
      "database",
      vars,
      vpc.privateSubnets[0].id,
      securityGroups.database.id,
      vpc.natGateway
    )

    // Client Service Resources
    const clientTaskDefinition = new EcsTaskDefinitionClient(
      this,
      "client_task_definition",
      vars,
      `http://${goldAlb.lb.dnsName},http://${silverAlb.lb.dnsName}`,
      monitoringIamRole.role.arn
    )

    new EcsServiceClient(
      this,
      "client",
      vars,
      cluster.arn,
      clientTaskDefinition.def.arn,
      clientAlb.targetGroup.arn,
      vpc.privateSubnets,
      securityGroups.clientService.id,
    )


    // Gold Service Resources
    const goldTaskDefinition = new EcsTaskDefinitionGold(
      this,
      "gold_task_definition",
      vars,
      monitoringIamRole.role.arn
    )

    new EcsServiceUpstream(
      this,
      "gold",
      vars,
      cluster.arn,
      goldTaskDefinition.def.arn,
      goldAlb.targetGroup.arn,
      vpc.privateSubnets,
      securityGroups.upstreamService.id
    )


    // Silver Service Resources
    const silverTaskDefinition = new EcsTaskDefinitionSilver(
      this,
      "silver_task_definition",
      vars,
      monitoringIamRole.role.arn
    )

    new EcsServiceUpstream(
      this,
      "silver",
      vars,
      cluster.arn,
      silverTaskDefinition.def.arn,
      silverAlb.targetGroup.arn,
      vpc.privateSubnets,
      securityGroups.upstreamService.id
    )

    // Metrics
    new DatadogProvider(this, "datadog")
    new DDClusterCpuMonitor(this, "cluster_cpu_monitor", vars, cluster.name)

    // Outputs
    new TerraformOutput(this, "client_service_endpoint", {
      value: clientAlb.lb.dnsName,
      description: "DNS name (endpoint) of the AWS ALB for Client service",
    })
  }
}

const app = new App();
const stack = new MyStack(app, "ecs-microservices-cdktf");
new RemoteBackend(stack, {
  hostname: "app.terraform.io",
  organization: process.env.CDKTF_ECS_TFC_ORGANIZATION || "",
  workspaces: {
    name: "ecs-microservices-cdktf"
  }
});
app.synth();
