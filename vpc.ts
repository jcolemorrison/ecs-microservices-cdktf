import { vpc, ec2 } from "@cdktf/provider-aws"
import { Construct } from "constructs"
import { Tfvars } from "./variables"
import { Fn } from "cdktf"

export class Network extends Construct {
  public vpc: vpc.Vpc
  public igw: vpc.InternetGateway
  public eigw: vpc.EgressOnlyInternetGateway
  public azs: string[]
  public publicSubnets: vpc.Subnet[]
  public privateSubnets: vpc.Subnet[]
  public natEip: ec2.Eip
  public natGateway: vpc.NatGateway
  public publicRouteTable: vpc.RouteTable
  public publicInternetAccessRoute: vpc.Route
  public publicRouteTableAssociations: vpc.RouteTableAssociation[]
  public privateRouteTable: vpc.RouteTable
  public privateInternetAccessRoute: vpc.Route
  public privateInternetAccessIpv6Route: vpc.Route
  public privateRouteTableAssociations: vpc.RouteTableAssociation[]

  constructor(
    scope: Construct,
    name: string,
    vars: Tfvars
  ) {
    super(scope, name)

    const nameTagPrefix = `${Fn.lookup(vars.defaultTags, "project", "")}`

    this.azs = ["a", "b", "c"].map((zone) => `${vars.defaultRegion}${zone}`)

    this.vpc = new vpc.Vpc(this, "main", {
      assignGeneratedIpv6CidrBlock: true,
      cidrBlock: vars.vpcCidr,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      instanceTenancy: "default",
      tags: {
        Name: `${nameTagPrefix}-vpc`,
      },
    })

    this.publicSubnets = this.azs.map((az, index) => {
      return new vpc.Subnet(this, "public_subnet_" + az, {
        assignIpv6AddressOnCreation: true,
        availabilityZone: az,
        cidrBlock: Fn.cidrsubnet(this.vpc.cidrBlock, 4, index),
        ipv6CidrBlock: Fn.cidrsubnet(this.vpc.ipv6CidrBlock, 8, index),
        mapPublicIpOnLaunch: true,
        tags: {
          Name: `${nameTagPrefix}-public-${az}`,
        },
        vpcId: this.vpc.id,
      })
    })

    this.privateSubnets = this.azs.map((az, index) => {
      return new vpc.Subnet(this, "private_subnet_" + az, {
        availabilityZone: az,
        cidrBlock: Fn.cidrsubnet(
          this.vpc.cidrBlock,
          4,
          index + this.publicSubnets.length
        ),
        tags: {
          Name: `${nameTagPrefix}-private-${az}`,
        },
        vpcId: this.vpc.id,
      })
    })

    // Public Routing Resources
    this.igw = new vpc.InternetGateway(this, "igw", {
      vpcId: this.vpc.id,
      tags: {
        Name: `${nameTagPrefix}-igw`,
      },
    })

    this.publicRouteTable = new vpc.RouteTable(this, "public", {
      vpcId: this.vpc.id,
      tags: { Name: `${nameTagPrefix}-public-rtb`}
    })

    this.publicInternetAccessRoute = new vpc.Route(this, "public_internet_access", {
      destinationCidrBlock: "0.0.0.0/0",
      gatewayId: this.igw.id,
      routeTableId: this.publicRouteTable.id,
    })

    this.publicRouteTableAssociations = this.publicSubnets.map((subnet) => {
      return new vpc.RouteTableAssociation(this, `public_route_table_association_${subnet.availabilityZoneInput}`, {
        subnetId: subnet.id,
        routeTableId: this.publicRouteTable.id
      })
    })

    // Private Routing Resources
    this.eigw = new vpc.EgressOnlyInternetGateway(this, "eigw", {
      vpcId: this.vpc.id,
      tags: { Name: `${nameTagPrefix}-eigw`},
    })

    this.natEip = new ec2.Eip(this, "nat_eip", {
      vpc: true,
      tags: { Name: `${nameTagPrefix}-nat-eip`}
    })

    this.natGateway = new vpc.NatGateway(this, "nat", {
      allocationId: this.natEip.id,
      dependsOn: [this.natEip, this.igw],
      subnetId: this.publicSubnets[0].id,
      tags: { Name: `${nameTagPrefix}-nat`}
    })

    this.privateRouteTable = new vpc.RouteTable(this, "private", {
      vpcId: this.vpc.id,
      tags: { Name: `${nameTagPrefix}-private-rtb`}
    })

    this.privateInternetAccessRoute = new vpc.Route(this, "private_internet_access", {
      destinationCidrBlock: "0.0.0.0/0",
      natGatewayId: this.natGateway.id,
      routeTableId: this.privateRouteTable.id,
    })

    this.privateInternetAccessIpv6Route = new vpc.Route(this, "private_internet_access_ipv6", {
      destinationIpv6CidrBlock: "::/0",
      egressOnlyGatewayId: this.eigw.id,
      routeTableId: this.privateRouteTable.id,
    })

    this.privateRouteTableAssociations = this.privateSubnets.map((subnet) => {
      return new vpc.RouteTableAssociation(this, `private_route_table_association_${subnet.availabilityZoneInput}`, {
        subnetId: subnet.id,
        routeTableId: this.privateRouteTable.id
      })
    })
  }
}