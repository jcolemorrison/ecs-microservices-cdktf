import { Construct } from "constructs"
import { Tfvars } from "./variables"
import { Dashboard, Monitor } from "@cdktf/provider-datadog"
import { Fn } from "cdktf"

export class DDClusterCpuMonitor extends Construct {
  public monitor: Monitor
  public dashboard: Dashboard
  constructor(
    scope: Construct,
    name: string,
    vars: Tfvars,
    clusterName: string
  ) {
    super(scope, name)

    const nameTagPrefix = `${Fn.lookup(vars.defaultTags, "project", "")}`

    this.monitor = new Monitor(this, `${name}_monitor`, {
      name: `${nameTagPrefix}-cluster-cpu`,
      type: "query alert",
      message: "CPU Usage Alert",
      query: `avg(last_5m):avg:ecs.fargate.cpu.percent{cluster_name:${clusterName}} > 50`
    })

    this.dashboard = new Dashboard(this,`${name}_dashboard`, {
      title: `${nameTagPrefix}-cluster-cpu`,
      description: "Time series graph of the Cluster CPU",
      layoutType: "ordered",
      widget: [
        {
          alertGraphDefinition: {
            alertId: this.monitor.id,
            vizType: "timeseries",
          }
        }
      ]
    })
  }
}