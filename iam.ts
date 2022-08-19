import { iam } from "@cdktf/provider-aws"
import { Fn } from "cdktf"
import { Construct } from "constructs"
import { Tfvars } from "./variables"

export class EcsMonitoringIamTaskExecRole extends Construct {
  public role: iam.IamRole

  constructor(
    scope: Construct,
    name: string,
    vars: Tfvars
  ) {
    super(scope, name)

    const nameTagPrefix = `${Fn.lookup(vars.defaultTags, "project", "")}`

    const assumeRolePolicyDoc = new iam.DataAwsIamPolicyDocument(this, "monitoring-assume-role-doc", {
      version: "2012-10-17",
      statement: [
        {
          effect: "Allow",
          actions: ["sts:AssumeRole"],
          principals: [{
            identifiers: ["ecs-tasks.amazonaws.com"],
            type: "Service"
          }]
        }
      ]
    })

    const monitoringPermissionsDoc = new iam.DataAwsIamPolicyDocument(this, "monitoring-permissions", {
      version: "2012-10-17",
      statement: [
        {
          effect: "Allow",
          actions: [
            "ecs:ListClusters",
            "ecs:ListContainerInstances",
            "ecs:DescribeContainerInstances"
          ],
          resources: ["*"]
        }
      ]
    })

    this.role = new iam.IamRole(this, "monitoring-task-exec-role", {
      namePrefix: `${nameTagPrefix}-te-role`,
      description: "Task execution role for monitoring with ECS Task definitions",
      assumeRolePolicy: assumeRolePolicyDoc.json
    })

    new iam.IamPolicy(this, "monitoring-permissions-attachment", {
      name: `${nameTagPrefix}-monitoring-policy`,
      policy: monitoringPermissionsDoc.json
    })
  }
}